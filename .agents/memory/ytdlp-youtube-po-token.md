---
name: yt-dlp YouTube PO token / 403 issue
description: YouTube blocks most yt-dlp audio formats on server IPs. Use bundled bin/yt-dlp (android_vr client) + cookies + StreamType.Arbitrary for reliable playback.
---

## Problem
As of mid-2026, YouTube requires a "PO token" for most adaptive audio-only formats
on headless server IPs. Several client workarounds have been tried over time:

- `tv_embedded,mweb` — **broken**: returns only storyboard formats (no audio) on this server IP
- `web,android,ios` — **broken**: format 18 not available, others need PO token
- `android_vr` — **works for most videos**, but some trigger bot-check ("Sign in to confirm")

## Working fix (as of July 2026)
Use the bundled `bin/yt-dlp` binary in `artifacts/discord-bot/bin/yt-dlp`.
It defaults to `android_vr` client + cookies for bot-checked videos.

Format selector: `251/249/bestaudio[ext=webm]/bestaudio`
StreamType: **`StreamType.Arbitrary`** — routes through ffmpeg, handles webm/opus AND m4a
fallbacks without silent failures. Do NOT use `StreamType.WebmOpus`: if yt-dlp falls
back to m4a (format 140), the player fails instantly and "queue has ended" appears.

**Do NOT pass `--extractor-args youtube:player_client=...`** when using the bundled binary —
android_vr is the default and adding other clients breaks the format list.

## ffmpeg setup
ffmpeg-static is installed as a dependency. Set `FFMPEG_PATH` before @discordjs/voice
loads prism-media — done at the top of `src/index.ts` via:
```ts
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
process.env.FFMPEG_PATH = _require('ffmpeg-static');
```

## Cookies (YOUTUBE_COOKIES secret)
Some videos still require auth even with android_vr. Set `YOUTUBE_COOKIES` secret to
the raw Netscape cookies.txt content (exported from browser via "Get cookies.txt LOCALLY"
extension). The code also accepts base64-encoded content and auto-detects which was used.
Cookie file is written to `/tmp/yt-cookies.txt` on startup.

**Validation**: cookies file MUST start with `# Netscape HTTP Cookie File` or
`# HTTP Cookie File` — anything else is rejected with a warning (not silently corrupt).

## How to apply
If YouTube audio breaks again: test `bin/yt-dlp --list-formats <url>` with no
`--extractor-args` first. If android_vr stops working, try `android_embed` or
`android_testsuite`. Format availability shifts — keep yt-dlp updated.
