// Set ffmpeg path from ffmpeg-static before @discordjs/voice loads prism-media
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const _ffmpegPath = _require('ffmpeg-static') as string;
if (_ffmpegPath) process.env.FFMPEG_PATH = _ffmpegPath;

import { Client, GatewayIntentBits, Events } from 'discord.js';
import play from 'play-dl';
import { onReady } from './handlers/ready.js';
import { onInteractionCreate } from './handlers/interactionCreate.js';

async function main(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!token) {
    console.error('[Bot] DISCORD_TOKEN is not set. Exiting.');
    process.exit(1);
  }

  // ── Initialise play-dl Spotify support ──────────────────────────────────────
  if (spotifyClientId && spotifyClientSecret) {
    try {
      await play.setToken({
        spotify: {
          client_id: spotifyClientId,
          client_secret: spotifyClientSecret,
          refresh_token: '',
          market: 'US',
        },
      });
      console.log('[Bot] Spotify support enabled');
    } catch (err) {
      console.warn('[Bot] Spotify token setup failed — Spotify URLs may not work:', err);
    }
  } else {
    console.warn('[Bot] SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set — Spotify support disabled');
  }

  // ── Create Discord client ────────────────────────────────────────────────────
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.once(Events.ClientReady, () => onReady(client));
  client.on(Events.InteractionCreate, onInteractionCreate);

  client.on('error', err => console.error('[Discord] Client error:', err));
  client.on('warn', msg => console.warn('[Discord] Warning:', msg));

  process.on('SIGTERM', () => {
    console.log('[Bot] SIGTERM — shutting down…');
    client.destroy();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Bot] SIGINT — shutting down…');
    client.destroy();
    process.exit(0);
  });

  await client.login(token);
}

main().catch(err => {
  console.error('[Bot] Fatal error:', err);
  process.exit(1);
});
