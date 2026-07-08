import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { getPlayer } from '../music/PlayerManager.js';
import { buildQueueEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('📋 Show the current music queue');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  const embed = buildQueueEmbed(player);
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
