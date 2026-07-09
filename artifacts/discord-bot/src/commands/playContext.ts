import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  type MessageContextMenuCommandInteraction,
  type VoiceChannel,
  GuildMember,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getPlayer } from '../music/PlayerManager.js';
import { resolveUrl, searchByQuery } from '../music/search.js';
import { buildNowPlayingEmbed, buildAddedEmbed } from '../utils/embeds.js';
import { buildControlRows } from '../utils/components.js';
import play from 'play-dl';

export const data = new ContextMenuCommandBuilder()
  .setName('▶️ Play')
  .setType(ApplicationCommandType.Message);

// Regex to extract first URL from a string
const URL_RE = /https?:\/\/[^\s]+/i;

export async function execute(interaction: MessageContextMenuCommandInteraction): Promise<void> {
  const member = interaction.member instanceof GuildMember ? interaction.member : null;
  const voiceChannel = member?.voice.channel as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({ content: '❌ Join a voice channel first!', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  // Extract URL or use the entire message content as a search query
  const msgContent = interaction.targetMessage.content;
  const urlMatch = msgContent.match(URL_RE);
  const query = urlMatch ? urlMatch[0] : msgContent.trim();

  if (!query) {
    await interaction.editReply({ content: '❌ The message has no text or URL to play.' });
    return;
  }

  const player = getPlayer(interaction.guildId!);
  let track = null;

  if (urlMatch) {
    const ytVal = play.yt_validate(query);
    const spVal = play.sp_validate(query);
    if (ytVal === 'video' || spVal === 'track' || spVal === 'album' || spVal === 'playlist') {
      track = await resolveUrl(query, interaction.user.id, interaction.user.username);
    }
  }

  if (!track) {
    track = await searchByQuery(query, interaction.user.id, interaction.user.username);
  }

  if (!track) {
    await interaction.editReply({ content: '❌ Could not find anything to play from that message.' });
    return;
  }

  track.requestedBy = interaction.user.id;
  track.requestedByName = interaction.user.username;

  await player.join(voiceChannel);
  const playingNow = await player.enqueue(track);

  if (playingNow) {
    const msg = await interaction.editReply({
      embeds: [buildNowPlayingEmbed(track, player)],
      components: buildControlRows(player),
    });
    player.controlMessage = msg;
  } else {
    await interaction.editReply({ embeds: [buildAddedEmbed(track, true)] });
    await player.refreshMessage();
  }
}
