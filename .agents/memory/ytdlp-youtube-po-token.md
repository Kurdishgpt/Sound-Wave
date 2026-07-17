---
name: yt-dlp YouTube PO token / 403 issue
description: YouTube blocks most yt-dlp audio formats on server IPs unless the android_vr client is used; bundled bin/yt-dlp defaults to android_vr which returns real opus formats without a PO token.
---

## Problem
As of mid-2026, YouTube requires a "PO token" for most adaptive audio-only formats
on headless server IPs. Several client workarounds have been tried over time:

- `tv_embedded,mweb` — **broken**: returns only storyboard formats (no audio) on this server IP
- `web,android,ios` — **broken**: format 18 not available, others need PO token
- `android_vr` — **works**: returns real opus formats (251/249 webm/opus) without a PO token

## Working fix (as of July 2026)
Use the bundled `bin/yt-dlp` binary in `artifacts/discord-bot/bin/yt-dlp`.
It defaults to `android_vr` client and returns formats 251 (opus 129k) and 249 (opus 46k).

Format selector: `251/249/bestaudio[ext=webm]/bestaudio`
StreamType: `StreamType.WebmOpus` — @discordjs/voice decodes this natively, no ffmpeg needed.

**Do NOT pass `--extractor-args youtube:player_client=...`** when using the bundled binary —
android_vr is the default and adding other clients breaks the format list.

## Why the bundled binary
The `yt-dlp-exec` npm package binary is the same version but its cached format selection
and default client may differ. The bundled `bin/yt-dlp` has been tested to work on this
server IP with android_vr. Both are version 2026.07.04.

## How to apply
If YouTube audio breaks again: test `bin/yt-dlp --list-formats <url>` with no
`--extractor-args` first. If android_vr stops working, try `android_embed` or
`android_testsuite`. Format availability shifts — keep yt-dlp updated.
