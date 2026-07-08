import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { getPlayer } from '../music/PlayerManager.js';
import { buildControlRows } from '../utils/components.js';
import { buildNowPlayingEmbed } from '../utils/embeds.js';
import { LoopMode } from '../types.js';

// ── /skip ────────────────────────────────────────────────────────────────────
export const skipData = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('⏭ Skip the current song');

export async function skipExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  if (!player.isActive()) {
    await interaction.reply({ content: '❌ Nothing is playing.', flags: MessageFlags.Ephemeral });
    return;
  }
  player.skip();
  await interaction.reply({ content: '⏭ Skipped!', flags: MessageFlags.Ephemeral });
}

// ── /stop ────────────────────────────────────────────────────────────────────
export const stopData = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('⏹ Stop playback and clear the queue');

export async function stopExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  player.stop();
  await interaction.reply({ content: '⏹ Stopped and cleared the queue.', flags: MessageFlags.Ephemeral });
}

// ── /pause ───────────────────────────────────────────────────────────────────
export const pauseData = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('⏸ Pause the current song');

export async function pauseExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  const ok = player.pause();
  await interaction.reply({
    content: ok ? '⏸ Paused.' : '❌ Nothing is playing.',
    flags: MessageFlags.Ephemeral,
  });
  if (ok) await player.refreshMessage();
}

// ── /resume ──────────────────────────────────────────────────────────────────
export const resumeData = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('▶️ Resume a paused song');

export async function resumeExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  const ok = player.resume();
  await interaction.reply({
    content: ok ? '▶️ Resumed.' : '❌ Not paused.',
    flags: MessageFlags.Ephemeral,
  });
  if (ok) await player.refreshMessage();
}

// ── /volume ──────────────────────────────────────────────────────────────────
export const volumeData = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('🔊 Set the playback volume')
  .addIntegerOption(opt =>
    opt.setName('level').setDescription('Volume level (0–200)').setRequired(true).setMinValue(0).setMaxValue(200),
  );

export async function volumeExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  const level = interaction.options.getInteger('level', true);
  player.setVolume(level);
  await interaction.reply({
    content: `🔊 Volume set to **${level}%**`,
    flags: MessageFlags.Ephemeral,
  });
  await player.refreshMessage();
}

// ── /loop ────────────────────────────────────────────────────────────────────
export const loopData = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('🔁 Set loop mode')
  .addStringOption(opt =>
    opt
      .setName('mode')
      .setDescription('Loop mode')
      .setRequired(true)
      .addChoices(
        { name: '➡️ Off', value: LoopMode.NONE },
        { name: '🔂 Track', value: LoopMode.TRACK },
        { name: '🔁 Queue', value: LoopMode.QUEUE },
      ),
  );

export async function loopExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  const mode = interaction.options.getString('mode', true) as LoopMode;
  player.loopMode = mode;
  const labels: Record<LoopMode, string> = {
    [LoopMode.NONE]: '➡️ Loop disabled.',
    [LoopMode.TRACK]: '🔂 Looping current track.',
    [LoopMode.QUEUE]: '🔁 Looping entire queue.',
  };
  await interaction.reply({ content: labels[mode], flags: MessageFlags.Ephemeral });
  await player.refreshMessage();
}

// ── /shuffle ─────────────────────────────────────────────────────────────────
export const shuffleData = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('🔀 Shuffle the queue');

export async function shuffleExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  if (player.queue.length < 2) {
    await interaction.reply({ content: '❌ Not enough songs in the queue to shuffle.', flags: MessageFlags.Ephemeral });
    return;
  }
  player.shuffle();
  await interaction.reply({ content: `🔀 Shuffled **${player.queue.length}** tracks!`, flags: MessageFlags.Ephemeral });
  await player.refreshMessage();
}

// ── /nowplaying ───────────────────────────────────────────────────────────────
export const nowplayingData = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('🎵 Show the currently playing song');

export async function nowplayingExecute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.guildId!);
  if (!player.currentTrack) {
    await interaction.reply({ content: '❌ Nothing is playing.', flags: MessageFlags.Ephemeral });
    return;
  }
  const { buildNowPlayingEmbed } = await import('../utils/embeds.js');
  const msg = await interaction.reply({
    embeds: [buildNowPlayingEmbed(player.currentTrack, player)],
    components: buildControlRows(player),
    fetchReply: true,
  });
  player.controlMessage = msg;
}
