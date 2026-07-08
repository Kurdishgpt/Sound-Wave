import type { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
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

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export const commands: Command[] = [
  { data: playCmd.data as unknown as SlashCommandBuilder, execute: playCmd.execute, autocomplete: playCmd.autocomplete },
  { data: queueCmd.data as unknown as SlashCommandBuilder, execute: queueCmd.execute },
  { data: skipData as unknown as SlashCommandBuilder, execute: skipExecute },
  { data: stopData as unknown as SlashCommandBuilder, execute: stopExecute },
  { data: pauseData as unknown as SlashCommandBuilder, execute: pauseExecute },
  { data: resumeData as unknown as SlashCommandBuilder, execute: resumeExecute },
  { data: volumeData as unknown as SlashCommandBuilder, execute: volumeExecute },
  { data: loopData as unknown as SlashCommandBuilder, execute: loopExecute },
  { data: shuffleData as unknown as SlashCommandBuilder, execute: shuffleExecute },
  { data: nowplayingData as unknown as SlashCommandBuilder, execute: nowplayingExecute },
];
