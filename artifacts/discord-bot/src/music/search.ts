import play from 'play-dl';
import { spawn } from 'child_process';
import { StreamType } from '@discordjs/voice';
import { createRequire } from 'module';
import type { Track } from '../types.js';

const require = createRequire(import.meta.url);
// Resolve the yt-dlp binary path via yt-dlp-exec's constants module
const { YOUTUBE_DL_PATH } = require('yt-dlp-exec/src/constants') as { YOUTUBE_DL_PATH: string };

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

export function getAudioStream(url: string) {
  // yt-dlp pipes raw audio (opus/webm) into stdout, which @discordjs/voice reads directly.
  const proc = spawn(YOUTUBE_DL_PATH, [
    url,
    '--no-playlist',
    '-f', 'bestaudio[ext=webm]/bestaudio/best',
    '--no-warnings',
    '-o', '-',          // output to stdout
    '--quiet',
  ]);

  proc.stderr.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error('[yt-dlp]', msg);
  });

  return { stream: proc.stdout, type: StreamType.Arbitrary };
}
