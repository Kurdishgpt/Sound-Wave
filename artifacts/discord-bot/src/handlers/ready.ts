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
    // toJSON() works for both SlashCommandBuilder and ContextMenuCommandBuilder
    const body = commands.map(c => c.data.toJSON());
    await rest.put(Routes.applicationCommands(clientId), { body });
    const slashCount = commands.filter(c => c.kind === 'slash').length;
    const menuCount = commands.filter(c => c.kind === 'contextMenu').length;
    console.log(`[Bot] Registered ${slashCount} slash + ${menuCount} context-menu command(s) globally`);
  } catch (err) {
    console.error('[Bot] Failed to register commands:', err);
  }
}
