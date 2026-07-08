import { EmbedBuilder } from 'discord.js';
import type { Track } from '../types.js';
import type { MusicPlayer } from '../music/MusicPlayer.js';
import { LoopMode } from '../types.js';

function loopLabel(mode: LoopMode): string {
  if (mode === LoopMode.TRACK) return '🔂 Track';
  if (mode === LoopMode.QUEUE) return '🔁 Queue';
  return '➡️ Off';
}

export function buildNowPlayingEmbed(track: Track, player: MusicPlayer): EmbedBuilder {
  const sourceTag = track.source === 'spotify' ? '🎵 Spotify → YouTube' : '▶️ YouTube';
  const artistLine = track.artist ? `**${track.artist}**` : '*Unknown Artist*';

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: '🎵 Now Playing' })
    .setTitle(track.title)
    .setURL(track.url)
    .setDescription(`${artistLine}\n\n\`${track.durationFormatted}\``)
    .addFields(
      {
        name: '👤 Requested by',
        value: `<@${track.requestedBy}>`,
        inline: true,
      },
      {
        name: '🔊 Volume',
        value: player.muted ? '🔇 Muted' : `${player.volume}%`,
        inline: true,
      },
      {
        name: '🔄 Loop',
        value: loopLabel(player.loopMode),
        inline: true,
      },
    )
    .setFooter({ text: sourceTag });

  if (track.thumbnail) {
    embed.setThumbnail(track.thumbnail);
  }

  if (player.queue.length > 0) {
    const preview = player.queue
      .slice(0, 3)
      .map((t, i) => `**${i + 1}.** ${t.title}`)
      .join('\n');
    const extra =
      player.queue.length > 3 ? `\n*…and ${player.queue.length - 3} more*` : '';
    embed.addFields({
      name: `📋 Up Next (${player.queue.length})`,
      value: preview + extra,
    });
  }

  return embed;
}

export function buildQueueEmbed(player: MusicPlayer): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('📋 Music Queue');

  if (!player.currentTrack) {
    return embed.setDescription('Nothing is playing right now.');
  }

  embed.setDescription(
    `**Now Playing:**\n[${player.currentTrack.title}](${player.currentTrack.url}) \`${player.currentTrack.durationFormatted}\``,
  );

  if (player.queue.length > 0) {
    const list = player.queue
      .slice(0, 10)
      .map(
        (t, i) =>
          `**${i + 1}.** [${t.title}](${t.url}) \`${t.durationFormatted}\` — <@${t.requestedBy}>`,
      )
      .join('\n');
    embed.addFields({ name: 'Up Next', value: list });
    if (player.queue.length > 10) {
      embed.setFooter({ text: `…and ${player.queue.length - 10} more tracks` });
    }
  } else {
    embed.addFields({ name: 'Up Next', value: 'Queue is empty.' });
  }

  return embed;
}

export function buildAddedEmbed(track: Track, queued: boolean): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(queued ? 0xffa500 : 0x57f287)
    .setTitle(queued ? '📋 Added to Queue' : '🎵 Now Playing')
    .setDescription(`**[${track.title}](${track.url})**`)
    .addFields(
      { name: '⏱ Duration', value: track.durationFormatted, inline: true },
      { name: '🎤 Artist', value: track.artist ?? 'Unknown', inline: true },
      { name: '📡 Source', value: track.source === 'spotify' ? '🎵 Spotify' : '▶️ YouTube', inline: true },
    );
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}
