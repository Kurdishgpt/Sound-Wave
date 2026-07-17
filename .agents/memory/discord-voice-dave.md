---
name: Discord voice DAVE protocol drop
description: Why @discordjs/voice <0.18 fails to connect — voice WS closes immediately after Hello opcode
---

## The rule
Always use `@discordjs/voice` **≥ 0.19.2** in this project.

**Why:** Discord introduced DAVE (audio E2EE) in late 2024. Voice servers now drop connections from clients that don't negotiate DAVE. The symptom is:
```
signalling → connecting → connecting → signalling (loops forever)
```
Debug shows: Identify sent → state code:1 (Identifying) → Hello received (op=8) → state code:6 (Closed, ws=false). The WS closes before Ready (op=2) is ever sent. `performIPDiscovery` is never reached.

**How to apply:** When adding or upgrading `@discordjs/voice`, pin to `^0.19.2` or higher. v0.19.2 also requires `discord-api-types: ^0.38.41` (peer dep via `@snazzah/davey`).

The old `src/patches/udpPatch.cjs` hack and `--require ./src/patches/udpPatch.cjs` start flag are no longer needed and were removed.
