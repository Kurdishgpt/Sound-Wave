import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { MusicPlayer } from '../music/MusicPlayer.js';
import type { Track } from '../types.js';
import { LoopMode } from '../types.js';

export function buildControlRows(
  player: MusicPlayer,
): ActionRowBuilder<ButtonBuilder>[] {
  const isPaused = player.isPaused();
  const loopMode = player.loopMode;
  const isMuted = player.muted;
  const isLiked = player.currentTrack
    ? player.likedTracks.has(player.currentTrack.url)
    : false;

  const loopEmoji =
    loopMode === LoopMode.TRACK ? '🔂' : loopMode === LoopMode.QUEUE ? '🔁' : '➡️';
  const loopStyle =
    loopMode !== LoopMode.NONE ? ButtonStyle.Success : ButtonStyle.Secondary;

  // Row 1: Suggest + transport
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_suggest')
      .setLabel('Select a suggested song')
      .setEmoji('🎵')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_prev')
      .setEmoji('⏮')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(isPaused ? 'music_resume' : 'music_pause')
      .setEmoji(isPaused ? '▶️' : '⏸')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji(loopEmoji)
      .setStyle(loopStyle),
  );

  // Row 2: Volume & seek
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_vol_down')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_rewind')
      .setEmoji('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true), // seek not supported by play-dl streams
    new ButtonBuilder()
      .setCustomId('music_like')
      .setEmoji('❤️')
      .setStyle(isLiked ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_forward')
      .setEmoji('⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true), // seek not supported by play-dl streams
    new ButtonBuilder()
      .setCustomId('music_vol_up')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary),
  );

  // Row 3: Advanced
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_mute')
      .setEmoji(isMuted ? '🔇' : '🔈')
      .setStyle(isMuted ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_queue_btn')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_disconnect')
      .setEmoji('🔌')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3];
}

export function buildSuggestionSelect(
  suggestions: Track[],
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = suggestions.map(t =>
    new StringSelectMenuOptionBuilder()
      .setLabel(t.title.slice(0, 100))
      .setValue(t.url)
      .setDescription(
        `${t.artist ?? 'Unknown'} • ${t.source} • ${t.durationFormatted}`.slice(0, 100),
      )
      .setEmoji(t.source === 'spotify' ? '🎵' : '▶️'),
  );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('music_suggestion_select')
      .setPlaceholder('Select a suggested song...')
      .addOptions(options),
  );
}
