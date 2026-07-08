/**
 * Run this script once to register slash commands with Discord:
 *   pnpm --filter @workspace/discord-bot run deploy
 *
 * The bot's ready handler also auto-registers on startup, so this is
 * mainly useful for forcing an immediate refresh during development.
 */
import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';

async function deploy(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
    process.exit(1);
  }

  const rest = new REST().setToken(token);
  const body = commands.map(c => c.data.toJSON());

  console.log(`Registering ${body.length} slash command(s)…`);
  await rest.put(Routes.applicationCommands(clientId), { body });
  console.log('Done! Commands registered globally (may take up to 1 hour to propagate).');
}

deploy().catch(err => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
