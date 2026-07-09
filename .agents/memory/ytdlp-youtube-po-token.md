---
name: yt-dlp YouTube PO token / 403 issue
description: YouTube blocks most yt-dlp audio formats (webm/opus, android/ios client formats) with 403 unless a PO token is supplied; workaround is to fall back to the web client's muxed format and transcode with ffmpeg.
---

## Problem
As of mid-2026, YouTube requires a "PO token" (proof-of-origin token) for most
adaptive audio-only formats (webm/opus, and android/ios client formats) served
via yt-dlp. Without one, yt-dlp either:
- Returns `HTTP Error 403: Forbidden` when requesting `bestaudio[ext=webm][acodec=opus]`, or
- Silently skips android/ios formats with a warning and then fails with
  "Requested format is not available" if no other format matches.

Generating a real PO token requires a browser-based token provider plugin
(e.g. bgutil-ytdlp-pot-provider) — extra infra not worth it for a simple bot.

## Working fix
- Format selector: `bestaudio/best` with `--extractor-args youtube:player_client=web,android,ios`.
  This lets yt-dlp fall back to the **web client's muxed format** (typically
  format `18`: mp4/h264 video + AAC audio) which does NOT require a PO token.
- Since format 18 is muxed video+audio (not pure webm/opus), the discord bot
  must use `StreamType.Arbitrary` (not `StreamType.WebmOpus`) so
  `@discordjs/voice` pipes it through ffmpeg to demux/transcode to Opus.
  This requires ffmpeg to be installed as a system dependency and on PATH.

## Why
YouTube's anti-bot PO token requirement rolled out broadly to adaptive
formats; muxed legacy formats (like 18) are still served without it, at the
cost of higher bandwidth (video track wasted) and needing ffmpeg to extract
audio instead of piping raw Opus natively.

## How to apply
If yt-dlp-based YouTube audio starts failing again with 403 or "format not
available" errors, check this format fallback + extractor-args combination
first before assuming yt-dlp itself is broken — it's usually YouTube tightening
PO token enforcement, not a yt-dlp bug. Keep yt-dlp updated (`yt-dlp-exec`
downloads a fresh binary) since format availability shifts over time.
