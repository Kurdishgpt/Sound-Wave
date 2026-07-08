import type { Client } from 'discord.js';
import { REST, Routes } from 'discord.js';
import { commands } from '../commands/index.js';

export async function onReady(client: Client): Promise<void> {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);

  // Auto-register slash commands on startup
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    console.error('[Bot] Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
    return;
  }

  try {
    const rest = new REST().setToken(token);
    const body = commands.map(c => c.data.toJSON());
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log(`[Bot] Registered ${body.length} slash command(s) globally`);
  } catch (err) {
    console.error('[Bot] Failed to register commands:', err);
  }
}
