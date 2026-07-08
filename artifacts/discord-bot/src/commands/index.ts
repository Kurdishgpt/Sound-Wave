import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
} from 'discord.js';
import * as playContextCmd from './playContext.js';
import * as playCmd from './play.js';
import * as queueCmd from './queue.js';
import {
  skipData, skipExecute,
  stopData, stopExecute,
  pauseData, pauseExecute,
  resumeData, resumeExecute,
  volumeData, volumeExecute,
  loopData, loopExecute,
  shuffleData, shuffleExecute,
  nowplayingData, nowplayingExecute,
} from './controls.js';

export interface SlashCommand {
  kind: 'slash';
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface ContextMenuCommand {
  kind: 'contextMenu';
  data: ContextMenuCommandBuilder;
  execute: (interaction: MessageContextMenuCommandInteraction) => Promise<void>;
}

export type Command = SlashCommand | ContextMenuCommand;

export const commands: Command[] = [
  // ── Message context menu ───────────────────────────────────────────────────
  {
    kind: 'contextMenu',
    data: playContextCmd.data as unknown as ContextMenuCommandBuilder,
    execute: playContextCmd.execute,
  },

  // ── Slash commands ──────────────────────────────────────────────────────────
  { kind: 'slash', data: playCmd.data as unknown as SlashCommandBuilder, execute: playCmd.execute, autocomplete: playCmd.autocomplete },
  { kind: 'slash', data: queueCmd.data as unknown as SlashCommandBuilder, execute: queueCmd.execute },
  { kind: 'slash', data: skipData as unknown as SlashCommandBuilder, execute: skipExecute },
  { kind: 'slash', data: stopData as unknown as SlashCommandBuilder, execute: stopExecute },
  { kind: 'slash', data: pauseData as unknown as SlashCommandBuilder, execute: pauseExecute },
  { kind: 'slash', data: resumeData as unknown as SlashCommandBuilder, execute: resumeExecute },
  { kind: 'slash', data: volumeData as unknown as SlashCommandBuilder, execute: volumeExecute },
  { kind: 'slash', data: loopData as unknown as SlashCommandBuilder, execute: loopExecute },
  { kind: 'slash', data: shuffleData as unknown as SlashCommandBuilder, execute: shuffleExecute },
  { kind: 'slash', data: nowplayingData as unknown as SlashCommandBuilder, execute: nowplayingExecute },
];
