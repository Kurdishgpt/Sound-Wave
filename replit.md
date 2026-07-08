# Adventurix Discord Music Bot

A Discord music bot supporting YouTube and Spotify with interactive button controls, song suggestions, and high-quality audio.

## Run & Operate

- `pnpm --filter @workspace/discord-bot run dev` — start the bot (tsx watch mode)
- `pnpm --filter @workspace/discord-bot run deploy` — force re-register slash commands
- `pnpm --filter @workspace/discord-bot run typecheck` — type-check the bot

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Discord: discord.js v14, @discordjs/voice v0.17
- Audio streaming: play-dl (YouTube + Spotify → YouTube)
- Opus encoding: opusscript (pure JS)
- Encryption: tweetnacl (pure JS)
- FFmpeg: ffmpeg-static

## Where things live

- `artifacts/discord-bot/src/index.ts` — entry point, client init, Spotify token setup
- `artifacts/discord-bot/src/music/MusicPlayer.ts` — per-guild audio player & queue
- `artifacts/discord-bot/src/music/PlayerManager.ts` — guild → player map
- `artifacts/discord-bot/src/music/search.ts` — YouTube/Spotify search via play-dl
- `artifacts/discord-bot/src/handlers/interactionCreate.ts` — all button/command routing
- `artifacts/discord-bot/src/utils/embeds.ts` — Discord embed builders
- `artifacts/discord-bot/src/utils/components.ts` — button row & suggestion select builders
- `artifacts/discord-bot/src/commands/` — slash command definitions
- `artifacts/discord-bot/src/handlers/ready.ts` — auto-registers slash commands on startup

## Slash Commands

| Command | Description |
|---|---|
| `/play <query>` | Play from YouTube URL, Spotify URL, or search query. Has autocomplete. |
| `/queue` | Show the current queue |
| `/skip` | Skip current track |
| `/stop` | Stop and clear queue |
| `/pause` | Pause playback |
| `/resume` | Resume playback |
| `/volume <0-200>` | Set volume |
| `/loop <off/track/queue>` | Set loop mode |
| `/shuffle` | Shuffle the queue |
| `/nowplaying` | Show now-playing embed with buttons |

## Button Controls

Each `/play` response shows an interactive embed with:
- Row 1: 🎵 Suggest | ⏮ Prev | ⏸/▶️ Pause/Resume | ⏭ Skip | 🔁 Loop
- Row 2: 🔉 Vol− | ⏪ Rewind | ❤️ Like | ⏩ Forward | 🔊 Vol+
- Row 3: 🔇 Mute | 🔀 Shuffle | ⏹ Stop | 📋 Queue | 🔌 Disconnect

The **🎵 Suggest** button fetches 5 related songs and shows a dropdown to pick one.

## Required Secrets

- `DISCORD_TOKEN` — bot token from Discord Developer Portal → Bot → Token
- `DISCORD_CLIENT_ID` — **Application ID** (numeric snowflake) from General Information page
- `SPOTIFY_CLIENT_ID` — from https://developer.spotify.com/dashboard
- `SPOTIFY_CLIENT_SECRET` — from the same Spotify app

## Architecture Decisions

- play-dl is used instead of ytdl-core — better maintenance and built-in Spotify URL resolution (converts to YouTube search)
- opusscript + tweetnacl instead of native bindings — reliable in cloud/NixOS without native compilation
- Per-guild MusicPlayer instances stored in a singleton map — clean isolation
- `manualStop` flag prevents Idle handler from double-advancing when `previous()` or `stop()` is called programmatically
- Slash commands auto-register on bot startup via the `ready` event

## User Preferences

_Populate as you build._

## Gotchas

- DISCORD_CLIENT_ID must be the **numeric Application ID** (e.g. `1234567890123456789`), NOT the OAuth client secret hex string
- Spotify URLs are resolved to YouTube equivalents — direct Spotify audio streaming is not used
- play-dl's `setToken` for Spotify only accepts `{ client_id, client_secret, refresh_token, market }` — no access_token/expiry fields
