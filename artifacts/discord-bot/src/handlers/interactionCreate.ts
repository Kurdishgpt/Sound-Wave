import {
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type AutocompleteInteraction,
  type VoiceChannel,
  GuildMember,
} from 'discord.js';
import { commands } from '../commands/index.js';
import { getPlayer } from '../music/PlayerManager.js';
import { buildNowPlayingEmbed, buildQueueEmbed } from '../utils/embeds.js';
import { buildControlRows, buildSuggestionSelect } from '../utils/components.js';
import { getSuggestions, searchByQuery } from '../music/search.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Return the voice channel the interaction member is currently in, or null. */
function getMemberVoiceChannel(interaction: ButtonInteraction | StringSelectMenuInteraction): VoiceChannel | null {
  const member = interaction.member instanceof GuildMember ? interaction.member : null;
  return (member?.voice.channel as VoiceChannel | null) ?? null;
}

// ─── router ───────────────────────────────────────────────────────────────────

export async function onInteractionCreate(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
    } else if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    console.error('[Interaction] Unhandled error:', err);
  }
}

// ─── handlers ─────────────────────────────────────────────────────────────────

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const cmd = commands.find(c => c.data.name === interaction.commandName);
  if (cmd?.autocomplete) {
    await cmd.autocomplete(interaction).catch(() => interaction.respond([]));
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const cmd = commands.find(c => c.data.name === interaction.commandName);
  if (!cmd) {
    await interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
    return;
  }
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`[Command] /${interaction.commandName}:`, err);
    const msg = { content: '❌ An error occurred.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => null);
    } else {
      await interaction.reply(msg).catch(() => null);
    }
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const player = getPlayer(interaction.guildId);
  const memberVoice = getMemberVoiceChannel(interaction);

  // Auth: user must be in a voice channel; if bot is active they should be in the same one
  if (!memberVoice) {
    await interaction.reply({ content: '❌ Join a voice channel first!', ephemeral: true });
    return;
  }

  try {
    switch (interaction.customId) {
      case 'music_pause': {
        const ok = player.pause();
        await interaction.reply({ content: ok ? '⏸ Paused.' : '❌ Not currently playing.', ephemeral: true });
        if (ok) await player.refreshMessage();
        break;
      }

      case 'music_resume': {
        const ok = player.resume();
        await interaction.reply({ content: ok ? '▶️ Resumed.' : '❌ Not paused.', ephemeral: true });
        if (ok) await player.refreshMessage();
        break;
      }

      case 'music_skip': {
        if (!player.isActive()) {
          await interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
          break;
        }
        player.skip();
        await interaction.reply({ content: '⏭ Skipped!', ephemeral: true });
        break;
      }

      case 'music_prev': {
        if (!player.hasPrevious()) {
          await interaction.reply({ content: '❌ No previous track.', ephemeral: true });
          break;
        }
        player.previous();
        await interaction.reply({ content: '⏮ Going back!', ephemeral: true });
        break;
      }

      case 'music_loop': {
        const mode = player.cycleLoop();
        const label: Record<string, string> = {
          none: '➡️ Loop disabled.',
          track: '🔂 Looping current track.',
          queue: '🔁 Looping entire queue.',
        };
        await interaction.reply({ content: label[mode] ?? 'Loop updated.', ephemeral: true });
        await player.refreshMessage();
        break;
      }

      case 'music_vol_up': {
        player.adjustVolume(10);
        await interaction.reply({ content: `🔊 Volume: **${player.volume}%**`, ephemeral: true });
        await player.refreshMessage();
        break;
      }

      case 'music_vol_down': {
        player.adjustVolume(-10);
        await interaction.reply({ content: `🔉 Volume: **${player.volume}%**`, ephemeral: true });
        await player.refreshMessage();
        break;
      }

      case 'music_mute': {
        player.toggleMute();
        await interaction.reply({
          content: player.muted ? '🔇 Muted.' : `🔈 Unmuted — ${player.volume}%.`,
          ephemeral: true,
        });
        await player.refreshMessage();
        break;
      }

      case 'music_like': {
        if (!player.currentTrack) {
          await interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
          break;
        }
        const liked = player.toggleLike(player.currentTrack.url);
        await interaction.reply({
          content: liked ? '❤️ Added to liked songs!' : '💔 Removed from liked songs.',
          ephemeral: true,
        });
        await player.refreshMessage();
        break;
      }

      case 'music_shuffle': {
        player.shuffle();
        await interaction.reply({ content: '🔀 Queue shuffled!', ephemeral: true });
        await player.refreshMessage();
        break;
      }

      case 'music_stop': {
        player.stop();
        await interaction.reply({ content: '⏹ Stopped and cleared the queue.', ephemeral: true });
        break;
      }

      case 'music_disconnect': {
        player.destroy();
        await interaction.reply({ content: '👋 Disconnected.', ephemeral: true });
        break;
      }

      case 'music_queue_btn': {
        await interaction.reply({ embeds: [buildQueueEmbed(player)], ephemeral: true });
        break;
      }

      case 'music_suggest': {
        if (!player.currentTrack) {
          await interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
          break;
        }
        await interaction.deferReply({ ephemeral: true });
        const suggestions = await getSuggestions(player.currentTrack);
        if (suggestions.length === 0) {
          await interaction.editReply({ content: '❌ Could not fetch suggestions right now.' });
          break;
        }
        await interaction.editReply({
          content: '**Select a suggested song:**',
          components: [buildSuggestionSelect(suggestions)],
        });
        break;
      }

      default:
        await interaction.reply({ content: '❓ Unknown action.', ephemeral: true });
    }
  } catch (err) {
    console.error(`[Button] ${interaction.customId}:`, err);
    const msg = { content: '❌ Something went wrong.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => null);
    } else {
      await interaction.reply(msg).catch(() => null);
    }
  }
}

async function handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guildId) return;
  if (interaction.customId !== 'music_suggestion_select') return;

  const memberVoice = getMemberVoiceChannel(interaction);
  if (!memberVoice) {
    await interaction.reply({ content: '❌ Join a voice channel first!', ephemeral: true });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });
    const url = interaction.values[0];
    const track = await searchByQuery(url, interaction.user.id, interaction.user.username);

    if (!track) {
      await interaction.editReply({ content: '❌ Could not load that track.' });
      return;
    }

    const player = getPlayer(interaction.guildId);
    await player.join(memberVoice);
    const playingNow = await player.enqueue(track);

    if (playingNow) {
      const msg = await interaction.editReply({
        embeds: [buildNowPlayingEmbed(track, player)],
        components: buildControlRows(player),
      });
      player.controlMessage = msg;
    } else {
      await interaction.editReply({
        content: `📋 **${track.title}** added to queue (position ${player.queue.length}).`,
      });
      await player.refreshMessage();
    }
  } catch (err) {
    console.error('[Select] suggestion_select:', err);
    const msg = { content: '❌ Something went wrong.' };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => null);
    } else {
      await interaction.reply({ ...msg, ephemeral: true }).catch(() => null);
    }
  }
}
