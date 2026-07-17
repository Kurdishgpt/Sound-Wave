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

  const loopEmoji = loopMode === LoopMode.TRACK ? '🔂' : '🔁';
  const loopStyle =
    loopMode !== LoopMode.NONE ? ButtonStyle.Primary : ButtonStyle.Secondary;

  // ── Row 1: Suggest + Queue (2 buttons — 1 visual line on mobile) ────────────
  // The suggest label is wide; the queue icon sits at the far right.
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_suggest')
      .setLabel('Select a suggested song')
      .setEmoji('🎵')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_queue_btn')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
  );

  // ── Row 2: Transport (5 buttons — mobile wraps 4+1, so 🔁 sits alone) ───────
  // ▶ and ⏸ are always shown; the inactive one is disabled (grayed out),
  // matching the reference layout of [▶][⏮][⏸][⏭] with [🔁] wrapping alone.
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_resume')
      .setEmoji('▶️')
      .setStyle(isPaused ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!isPaused),
    new ButtonBuilder()
      .setCustomId('music_prev')
      .setEmoji('⏮')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_pause')
      .setEmoji('⏸')
      .setStyle(!isPaused ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(isPaused),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji(loopEmoji)
      .setStyle(loopStyle),
  );

  // ── Row 3: Seek & like (4 buttons — 1 visual line on mobile) ───────────────
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_mute')
      .setEmoji(isMuted ? '🔇' : '🔈')
      .setStyle(isMuted ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_rewind')
      .setEmoji('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('music_like')
      .setEmoji(isLiked ? '❤️' : '🤍')
      .setStyle(isLiked ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_forward')
      .setEmoji('⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );

  // ── Row 4: Volume down alone ────────────────────────────────────────────────
  const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_vol_down')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
  );

  // ── Row 5: Utility (5 buttons — mobile wraps 4+1, so 🔌 sits alone) ────────
  const row5 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_vol_up')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('✖️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_vol_down2')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_disconnect')
      .setEmoji('🔌')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3, row4, row5];
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
