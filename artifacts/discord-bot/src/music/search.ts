import play from 'play-dl';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { StreamType } from '@discordjs/voice';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { writeFileSync } from 'fs';
import type { Readable } from 'stream';
import type { Track } from '../types.js';

// Use the bundled yt-dlp binary (android_vr client — no PO token required,
// returns real audio formats on server IPs where tv_embedded/mweb are blocked).
const __dirname = dirname(fileURLToPath(import.meta.url));
const YOUTUBE_DL_PATH = resolve(__dirname, '../../bin/yt-dlp');

// ── YouTube cookies ───────────────────────────────────────────────────────────
// Set YOUTUBE_COOKIES to your Netscape cookies.txt content (raw or base64).
// Export from Chrome/Firefox with the "Get cookies.txt LOCALLY" extension.
const COOKIES_PATH = '/tmp/yt-cookies.txt';
// Keep the original cookie content in memory so we can re-write it fresh before
// every yt-dlp invocation — yt-dlp overwrites the file after each request and
// wipes auth cookies, so we must restore them ourselves each time.
let cookiesContent: string | null = null;

function initCookies(): void {
  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw) return;

  // Accept either raw Netscape cookies.txt OR base64-encoded content.
  // Try base64 first; if the decoded result looks like a cookies file use it,
  // otherwise fall back to treating the secret value as raw text.
  let content = raw.trim();
  if (!content.startsWith('#')) {
    try {
      const decoded = Buffer.from(content, 'base64').toString('utf-8');
      if (decoded.startsWith('#')) content = decoded;
    } catch { /* not base64 — use raw */ }
  }

  // Validate: must be a Netscape HTTP Cookie File
  if (!content.startsWith('# Netscape HTTP Cookie File') && !content.startsWith('# HTTP Cookie File')) {
    console.warn('[yt-dlp] YOUTUBE_COOKIES does not look like a valid Netscape cookies file — cookies disabled. Make sure you exported cookies.txt from your browser (not base64-encoded).');
    return;
  }

  cookiesContent = content;
  console.log('[yt-dlp] Cookies loaded from YOUTUBE_COOKIES secret');
}

/** Write the original cookies fresh to disk before each yt-dlp call.
 *  Returns true if cookies are available. */
function refreshCookies(): boolean {
  if (!cookiesContent) return false;
  try {
    writeFileSync(COOKIES_PATH, cookiesContent, { mode: 0o600 });
    return true;
  } catch (err) {
    console.warn('[yt-dlp] Failed to write cookies file:', (err as Error).message);
    return false;
  }
}

initCookies();

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function searchTracks(query: string, limit = 5): Promise<Track[]> {
  try {
    const results = await play.search(query, { source: { youtube: 'video' }, limit });
    return results.map(v => ({
      title: v.title ?? 'Unknown',
      url: v.url,
      thumbnail: v.thumbnails?.[0]?.url,
      duration: v.durationInSec,
      durationFormatted: v.durationRaw || formatDuration(v.durationInSec),
      requestedBy: '',
      requestedByName: '',
      source: 'youtube' as const,
      artist: v.channel?.name,
    }));
  } catch {
    return [];
  }
}

export async function resolveUrl(
  url: string,
  requestedBy: string,
  requestedByName: string,
): Promise<Track | null> {
  try {
    const ytVal = play.yt_validate(url);

    if (ytVal === 'video') {
      const info = await play.video_info(url);
      const d = info.video_details;
      return {
        title: d.title ?? 'Unknown',
        url: d.url,
        thumbnail: d.thumbnails?.[0]?.url,
        duration: d.durationInSec,
        durationFormatted: d.durationRaw || formatDuration(d.durationInSec),
        requestedBy,
        requestedByName,
        source: 'youtube',
        artist: d.channel?.name,
      };
    }

    // Spotify URL
    const spVal = play.sp_validate(url);
    if (spVal === 'track') {
      const sp = await play.spotify(url);
      if (sp.type !== 'track') return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = sp as any;
      const searchQuery = `${t.name} ${t.artists?.[0]?.name ?? ''}`.trim();
      const results = await play.search(searchQuery, { source: { youtube: 'video' }, limit: 1 });
      if (!results[0]) return null;
      const v = results[0];
      return {
        title: `${t.name} - ${t.artists?.[0]?.name ?? ''}`,
        url: v.url,
        thumbnail: t.thumbnail?.url ?? v.thumbnails?.[0]?.url,
        duration: v.durationInSec,
        durationFormatted: v.durationRaw || formatDuration(v.durationInSec),
        requestedBy,
        requestedByName,
        source: 'spotify',
        artist: t.artists?.[0]?.name,
      };
    }

    if (spVal === 'playlist' || spVal === 'album') {
      const sp = await play.spotify(url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spAny = sp as any;
      const tracks: Track[] = [];
      const items: unknown[] = spAny.fetched_tracks?.get('1') ?? [];
      for (const item of items.slice(0, 50)) {
        const t = item as any;
        const q = `${t.name} ${t.artists?.[0]?.name ?? ''}`.trim();
        const res = await play.search(q, { source: { youtube: 'video' }, limit: 1 });
        if (res[0]) {
          tracks.push({
            title: `${t.name} - ${t.artists?.[0]?.name ?? ''}`,
            url: res[0].url,
            thumbnail: t.thumbnail?.url ?? res[0].thumbnails?.[0]?.url,
            duration: res[0].durationInSec,
            durationFormatted: res[0].durationRaw || formatDuration(res[0].durationInSec),
            requestedBy,
            requestedByName,
            source: 'spotify',
            artist: t.artists?.[0]?.name,
          });
        }
      }
      return tracks[0] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function searchByQuery(
  query: string,
  requestedBy: string,
  requestedByName: string,
): Promise<Track | null> {
  try {
    const results = await play.search(query, { source: { youtube: 'video' }, limit: 1 });
    if (!results[0]) return null;
    const v = results[0];
    return {
      title: v.title ?? 'Unknown',
      url: v.url,
      thumbnail: v.thumbnails?.[0]?.url,
      duration: v.durationInSec,
      durationFormatted: v.durationRaw || formatDuration(v.durationInSec),
      requestedBy,
      requestedByName,
      source: 'youtube',
      artist: v.channel?.name,
    };
  } catch {
    return null;
  }
}

export async function getSuggestions(track: Track): Promise<Track[]> {
  // Search for related tracks based on artist + title
  const query = track.artist ? `${track.artist} music` : track.title;
  return searchTracks(query, 5);
}

export function getAudioStream(url: string): { stream: Readable; type: StreamType; process: ChildProcessWithoutNullStreams } {
  // android_vr client (default) + fresh cookies per request is the most reliable
  // combination on server IPs. The web client lacks a JS runtime for challenge
  // solving and returns only storyboard images; android_vr bypasses that.
  //
  // Format priority:
  //   251 = webm/opus 160kbps (best quality)
  //   250 = webm/opus  70kbps
  //   249 = webm/opus  50kbps
  //   18  = mp4/aac   128kbps muxed — universal fallback, no challenge needed
  //
  // StreamType.Arbitrary routes through FFmpeg, which handles webm, mp4, m4a.
  const args = [
    url,
    '--no-playlist',
    '-f', '251/250/249/bestaudio[ext=webm]/18/bestaudio',
    '--audio-quality', '0',
    '--no-warnings',
    '-o', '-',
    '--quiet',
  ];

  // Re-write the original cookies fresh before every spawn — yt-dlp overwrites
  // the file after each request and strips auth cookies, so we must restore them.
  if (refreshCookies()) {
    args.splice(1, 0, '--cookies', COOKIES_PATH);
  }

  const proc = spawn(YOUTUBE_DL_PATH, args);

  proc.on('error', (err) => {
    console.error('[yt-dlp] Failed to spawn process:', err.message);
  });

  proc.stderr.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    // Broken pipe is expected when the user skips / stops — suppress it.
    if (msg && !msg.includes('Broken pipe')) console.error('[yt-dlp]', msg);
  });

  // Silence EPIPE on the readable side as well (expected on manual stop/skip).
  proc.stdout.on('error', () => {});

  // StreamType.Arbitrary routes through ffmpeg — handles webm/opus, m4a, or
  // any other format yt-dlp may return without silent playback failures.
  return { stream: proc.stdout, type: StreamType.Arbitrary, process: proc };
}
