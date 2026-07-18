---
name: yt-dlp YouTube PO token / bot-detection fix
description: YouTube blocks most yt-dlp clients on server IPs. Use web player client + format 18 fallback + StreamType.Arbitrary for reliable playback.
---

## Problem
YouTube bot-detection ("Sign in to confirm you're not a bot") blocks `android_vr`, `ios`,
and `android` clients on server IPs without a PO token. Symptoms: yt-dlp exits code 1,
track silently fails and queue advances.

## Client history
- `tv_embedded`, `mweb` — broken: returns only storyboard formats (no audio)
- `android`, `ios`, `android_vr` — **broken as of July 2026**: bot-detected on server IPs
- **`web`** — **current working fix**: avoids bot-detection without PO token

## Working fix (as of July 2026)
Pass `--extractor-args "youtube:player_client=web"` explicitly.

Format selector: `251/250/249/bestaudio[ext=webm]/18/bestaudio`
- Formats 251/250/249 = webm/opus (best quality, may still need PO token on some videos)
- Format 18 = mp4/aac 128kbps muxed — **never requires PO token**, universal fallback

StreamType: **`StreamType.Arbitrary`** — routes through FFmpeg, handles webm, mp4, m4a
without silent failures. Do NOT use `StreamType.WebmOpus` — if yt-dlp returns mp4/m4a
(format 18 fallback), the player fails instantly.

## ffmpeg setup
ffmpeg-static is installed as a dependency. Set `FFMPEG_PATH` before @discordjs/voice
loads prism-media — done at the top of `src/index.ts` via:
```ts
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
process.env.FFMPEG_PATH = _require('ffmpeg-static');
```

## Cookies (YOUTUBE_COOKIES secret)
Some videos still require auth. Set `YOUTUBE_COOKIES` secret to raw Netscape cookies.txt
content (exported from browser via "Get cookies.txt LOCALLY" extension). Also accepts
base64-encoded content (auto-detected). Written to `/tmp/yt-cookies.txt` on startup.

**Validation**: must start with `# Netscape HTTP Cookie File` or `# HTTP Cookie File`.

## How to apply
If YouTube audio breaks again: test with `--extractor-args "youtube:player_client=web"`.
If web client stops working, try `web_embedded` or `web_creator`. Format availability
shifts — keep `bin/yt-dlp` updated.
