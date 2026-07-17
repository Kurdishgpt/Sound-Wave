---
name: Discord voice DAVE protocol drop + UDP patch
description: Two separate voice issues — DAVE protocol (upgrade @discordjs/voice to ≥0.19.2) and UDP IP discovery blocked (use udpPatch.cjs via --require).
---

## Issue 1: DAVE protocol drops (Hello received, WS closes, never reaches Ready)
@discordjs/voice ≤0.17.0 is incompatible with Discord's DAVE E2E encryption protocol
rolled out in 2024+. Symptoms: voice WS connects (Hello received) then immediately
drops — bot never reaches the Ready voice state.

**Fix**: upgrade `@discordjs/voice` to ≥0.19.2 in `artifacts/discord-bot/package.json`.
Current version is 0.19.2 — already correct as of July 2026.

## Issue 2: UDP IP discovery blocked (voice hangs at Signalling)
@discordjs/voice performs UDP IP discovery by sending a probe to Discord's voice server
and waiting for an echo reply. On Replit, outbound UDP echo is blocked, so the probe
never returns and the voice connection cycles back to "signalling" indefinitely.

**Fix**: `src/patches/udpPatch.cjs` intercepts `dgram.createSocket`, detects the 74-byte
discovery probe, fetches the external IP via HTTPS (api.ipify.org), and emits a
correctly-formatted discovery response locally. All other UDP traffic passes through unchanged.

**Critical**: This patch MUST be loaded via `--require` before any app code:
```
node --require ./src/patches/udpPatch.cjs --import tsx/esm src/index.ts
```
The start script in `package.json` already includes this as of July 2026.

## Note on patchVoice.cjs
`scripts/patchVoice.cjs` is dead code — it patches @discordjs/voice@0.17.0's dist/index.js
directly but the installed version is 0.19.2, so the file path doesn't exist and the
script exits silently. `udpPatch.cjs` is the correct, version-agnostic replacement.
