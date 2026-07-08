import { MusicPlayer } from './MusicPlayer.js';

const players = new Map<string, MusicPlayer>();

export function getPlayer(guildId: string): MusicPlayer {
  let player = players.get(guildId);
  if (!player) {
    player = new MusicPlayer(guildId);
    players.set(guildId, player);
  }
  return player;
}

export function removePlayer(guildId: string): void {
  const player = players.get(guildId);
  if (player) {
    player.destroy();
    players.delete(guildId);
  }
}
