import { EmbedBuilder } from 'discord.js';
import type { Track } from '../types.js';
import type { MusicPlayer } from '../music/MusicPlayer.js';
import { LoopMode } from '../types.js';

// ── Luna-style colour palette ─────────────────────────────────────────────────
const COLOR_PLAYING = 0x9b59b6;  // purple — now playing
const COLOR_QUEUED  = 0x2c2f33;  // dark grey — added to queue
const COLOR_QUEUE   = 0x23272a;  // darker — queue list

/** Progress bar: 15-char block bar. Position is always 0 (streams have no seek). */
function progressBar(current = 0, total = 1, length = 15): string {
  const filled = Math.round((current / total) * length);
  return '▬'.repeat(filled) + '🔘' + '▬'.repeat(length - filled);
}

function loopLabel(mode: LoopMode): string {
  if (mode === LoopMode.TRACK) return '🔂 Track';
  if (mode === LoopMode.QUEUE) return '🔁 Queue';
  return 'Off';
}

function sourceLabel(source: string): string {
  return source === 'spotify' ? '🎵 Spotify' : '▶️ YouTube';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Now Playing embed  (Luna-style)
// ─────────────────────────────────────────────────────────────────────────────
export function buildNowPlayingEmbed(track: Track, player: MusicPlayer): EmbedBuilder {
  const bar = progressBar(0, 1, 15);
  const volumeStr = player.muted ? '🔇 Muted' : `🔊 ${player.volume}%`;
  const loopStr   = loopLabel(player.loopMode);

  const embed = new EmbedBuilder()
    .setColor(COLOR_PLAYING)
    .setAuthor({ name: '▶  Now Playing' })
    .setTitle(track.title)
    .setURL(track.url)
    .setDescription(
      [
        track.artist ? `**${track.artist}**` : '',
        '',
        `${bar}`,
        `\`0:00\` / \`${track.durationFormatted}\``,
      ]
        .filter(l => l !== undefined)
        .join('\n'),
    )
    .addFields(
      { name: 'Source',       value: sourceLabel(track.source ?? 'youtube'), inline: true },
      { name: 'Volume',       value: volumeStr,  inline: true },
      { name: 'Loop',         value: loopStr,    inline: true },
      { name: 'Requested by', value: `<@${track.requestedBy}>`, inline: true },
    )
    .setFooter({ text: player.queue.length > 0 ? `${player.queue.length} track${player.queue.length === 1 ? '' : 's'} in queue` : 'Queue is empty' });

  if (track.thumbnail) {
    embed.setImage(track.thumbnail);   // large image, not thumbnail — Luna style
  }

  return embed;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Queue embed
// ─────────────────────────────────────────────────────────────────────────────
export function buildQueueEmbed(player: MusicPlayer): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLOR_QUEUE).setTitle('📋  Queue');

  if (!player.currentTrack) {
    return embed.setDescription('Nothing is playing right now.');
  }

  const nowLine = `**Now Playing**\n[${player.currentTrack.title}](${player.currentTrack.url}) \`${player.currentTrack.durationFormatted}\``;

  if (player.queue.length === 0) {
    return embed.setDescription(`${nowLine}\n\n*Queue is empty*`);
  }

  const list = player.queue
    .slice(0, 10)
    .map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) \`${t.durationFormatted}\` — <@${t.requestedBy}>`)
    .join('\n');

  embed.setDescription(`${nowLine}\n\n${list}`);

  if (player.queue.length > 10) {
    embed.setFooter({ text: `…and ${player.queue.length - 10} more tracks` });
  }

  return embed;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Added-to-queue / playing-now confirmation embed
// ─────────────────────────────────────────────────────────────────────────────
export function buildAddedEmbed(track: Track, queued: boolean): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(queued ? COLOR_QUEUED : COLOR_PLAYING)
    .setAuthor({ name: queued ? '📋  Added to Queue' : '▶  Now Playing' })
    .setTitle(track.title)
    .setURL(track.url)
    .addFields(
      { name: '⏱ Duration', value: track.durationFormatted,              inline: true },
      { name: '🎤 Artist',  value: track.artist ?? 'Unknown',            inline: true },
      { name: '📡 Source',  value: sourceLabel(track.source ?? 'youtube'), inline: true },
    );

  if (track.thumbnail) embed.setThumbnail(track.thumbnail);

  return embed;
}
