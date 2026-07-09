import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type VoiceChannel,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import { getPlayer } from '../music/PlayerManager.js';
import { searchTracks, resolveUrl, searchByQuery } from '../music/search.js';
import { buildNowPlayingEmbed, buildAddedEmbed } from '../utils/embeds.js';
import { buildControlRows } from '../utils/components.js';
import play from 'play-dl';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('▶️ Play a song from YouTube or Spotify')
  .addStringOption(opt =>
    opt
      .setName('query')
      .setDescription('Song name, YouTube URL, or Spotify URL')
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused();
  if (!focused || focused.length < 2) {
    await interaction.respond([]).catch(() => null);
    return;
  }
  try {
    // Discord discards autocomplete interactions after ~3s (error 10062 "Unknown
    // interaction" if we respond late). play-dl's search can occasionally hang on
    // a slow network round-trip, so race it against a hard timeout and bail with
    // an empty list rather than risk throwing on a dead interaction.
    const results = await Promise.race([
      searchTracks(focused, 5),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('autocomplete timeout')), 2500)),
    ]);
    await interaction.respond(
      results.map(t => ({
        name: `${t.title}${t.artist ? ` — ${t.artist}` : ''} [${t.durationFormatted}]`.slice(
          0,
          100,
        ),
        value: t.url,
      })),
    );
  } catch {
    // Interaction may already be expired at this point (10062) — swallow, don't crash.
    await interaction.respond([]).catch(() => null);
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({
      content: '❌ You need to be in a voice channel first!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const query = interaction.options.getString('query', true);
  const player = getPlayer(interaction.guildId!);

  let track = null;

  if (query.startsWith('http')) {
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
    await interaction.editReply({
      content: '❌ Could not find that song. Try a different query!',
    });
    return;
  }

  track.requestedBy = interaction.user.id;
  track.requestedByName = interaction.user.username;

  await player.join(voiceChannel);
  const playingNow = await player.enqueue(track);

  if (playingNow) {
    // First track — show full player UI
    const msg = await interaction.editReply({
      embeds: [buildNowPlayingEmbed(track, player)],
      components: buildControlRows(player),
    });
    player.controlMessage = msg;
  } else {
    // Added to queue
    await interaction.editReply({
      embeds: [buildAddedEmbed(track, true)],
    });
    await player.refreshMessage();
  }
}
