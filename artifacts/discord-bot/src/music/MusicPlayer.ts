import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  type AudioPlayer,
  type VoiceConnection,
  type AudioResource,
  type DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import type { VoiceChannel, Message } from 'discord.js';
import { type Track, LoopMode } from '../types.js';
import { getAudioStream } from './search.js';
import { buildNowPlayingEmbed } from '../utils/embeds.js';
import { buildControlRows } from '../utils/components.js';

export class MusicPlayer {
  public queue: Track[] = [];
  public currentTrack: Track | null = null;
  public loopMode: LoopMode = LoopMode.NONE;
  public volume = 100;
  public muted = false;
  public likedTracks = new Set<string>();
  public history: Track[] = [];
  public controlMessage: Message | null = null;

  private player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private resource: AudioResource | null = null;
  private readonly guildId: string;
  /** Set to true before a manual stop() to prevent the Idle handler re-advancing the queue. */
  private manualStop = false;
  /** Active yt-dlp child process — killed on skip/stop to avoid broken pipe errors. */
  private ytdlpProcess: ReturnType<typeof import('child_process').spawn> | null = null;
  /** Monotonic counter guarding against stale async playTrack() completions overriding newer playback. */
  private playGeneration = 0;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      // If we triggered this stop manually (previous/destroy), skip the auto-advance logic.
      if (this.manualStop) {
        this.manualStop = false;
        return;
      }

      if (this.loopMode === LoopMode.TRACK && this.currentTrack) {
        this.playTrack(this.currentTrack);
        return;
      }

      // Push current track into history / back of queue before advancing.
      if (this.currentTrack) {
        this.history.push(this.currentTrack);
        if (this.loopMode === LoopMode.QUEUE) {
          this.queue.push(this.currentTrack);
        }
        this.currentTrack = null;
      }

      this.advanceQueue();
    });

    this.player.on('error', err => {
      console.error('[MusicPlayer] Audio error:', err.message);
      this.manualStop = false;
      this.advanceQueue();
    });
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private async playTrack(track: Track): Promise<void> {
    const generation = ++this.playGeneration;
    try {
      this.currentTrack = track;
      const stream = getAudioStream(track.url);

      // A newer playTrack() call (skip/previous/auto-advance) started while we were
      // setting up this stream — discard this one instead of clobbering the newer state.
      if (generation !== this.playGeneration) {
        stream.process.kill('SIGKILL');
        return;
      }

      this.killYtdlp();
      this.ytdlpProcess = stream.process;
      stream.process.once('close', code => {
        if (code !== 0 && code !== null) {
          console.error(`[MusicPlayer] yt-dlp exited with code ${code} for "${track.title}"`);
        }
      });
      this.resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      this.applyVolume();
      this.player.play(this.resource);
      console.log(`[MusicPlayer] Now playing "${track.title}" (guild ${this.guildId})`);
    } catch (err) {
      if (generation !== this.playGeneration) return; // superseded — ignore
      console.error('[MusicPlayer] Failed to play track:', err);
      this.currentTrack = null;
      this.advanceQueue();
    }
  }

  private killYtdlp(): void {
    if (this.ytdlpProcess && !this.ytdlpProcess.killed) {
      this.ytdlpProcess.kill('SIGKILL');
    }
    this.ytdlpProcess = null;
  }

  private applyVolume(): void {
    if (this.resource?.volume) {
      this.resource.volume.setVolume(this.muted ? 0 : this.volume / 100);
    }
  }

  private advanceQueue(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.playTrack(next).then(() => this.refreshMessage());
    } else {
      this.currentTrack = null;
      this.refreshMessage();
    }
  }

  // ── public API ─────────────────────────────────────────────────────────────

  async join(channel: VoiceChannel): Promise<void> {
    const existing = getVoiceConnection(this.guildId);
    if (existing) {
      this.connection = existing;
    } else {
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: this.guildId,
        // discord.js ships discord-api-types@0.37 while @discordjs/voice expects 0.38;
        // cast is safe at runtime — the adapter shape is compatible.
        adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
        selfDeaf: false,
        debug: true,
      });

      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          this.destroy();
        }
      });

      this.connection.on('error', err => {
        console.error('[MusicPlayer] Voice connection error:', err.message);
      });

      this.connection.on('stateChange', (oldState, newState) => {
        console.log(`[MusicPlayer] Voice connection state: ${oldState.status} -> ${newState.status}`);
      });

      this.connection.on('debug', msg => {
        console.log(`[VoiceDebug] ${msg}`);
      });
    }

    // Wait until the connection is actually Ready before returning — otherwise
    // player.play() can be called (and packets dropped) before the UDP/voice
    // handshake finishes, causing silent "joins but no sound" behavior.
    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
    } catch (err) {
      console.error('[MusicPlayer] Voice connection failed to become ready:', err);
      throw new Error('Failed to connect to the voice channel. Please try again.');
    }

    this.connection.subscribe(this.player);
  }

  /** Add a track. Returns true if it started playing immediately, false if queued. */
  async enqueue(track: Track): Promise<boolean> {
    if (!this.currentTrack && this.queue.length === 0) {
      await this.playTrack(track);
      return true;
    }
    this.queue.push(track);
    return false;
  }

  pause(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return true;
    }
    return false;
  }

  /** Skip current track. State mutations happen in the Idle handler, not here. */
  skip(): void {
    // Just stop; the Idle event handler does the history/queue mutation and advance.
    this.player.stop();
    this.killYtdlp();
  }

  hasPrevious(): boolean {
    return this.history.length > 0;
  }

  previous(): void {
    if (this.history.length === 0) return;
    const prev = this.history.pop()!;
    if (this.currentTrack) this.queue.unshift(this.currentTrack);
    this.currentTrack = null;
    // Prevent the Idle handler from re-advancing when we call stop(true).
    this.manualStop = true;
    this.player.stop(true);
    this.killYtdlp();
    this.playTrack(prev).then(() => this.refreshMessage());
  }

  stop(): void {
    this.queue = [];
    this.currentTrack = null;
    this.manualStop = true;
    this.player.stop(true);
    this.killYtdlp();
    this.refreshMessage();
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(200, vol));
    this.applyVolume();
  }

  adjustVolume(delta: number): void {
    this.setVolume(this.volume + delta);
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.applyVolume();
  }

  shuffle(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  cycleLoop(): LoopMode {
    if (this.loopMode === LoopMode.NONE) this.loopMode = LoopMode.TRACK;
    else if (this.loopMode === LoopMode.TRACK) this.loopMode = LoopMode.QUEUE;
    else this.loopMode = LoopMode.NONE;
    return this.loopMode;
  }

  /** Toggle like state. Returns new liked state. */
  toggleLike(url: string): boolean {
    if (this.likedTracks.has(url)) {
      this.likedTracks.delete(url);
      return false;
    }
    this.likedTracks.add(url);
    return true;
  }

  isPaused(): boolean {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }

  isActive(): boolean {
    return (
      this.currentTrack !== null ||
      this.player.state.status === AudioPlayerStatus.Playing ||
      this.player.state.status === AudioPlayerStatus.Paused
    );
  }

  async refreshMessage(): Promise<void> {
    if (!this.controlMessage) return;
    try {
      if (this.currentTrack) {
        await this.controlMessage.edit({
          embeds: [buildNowPlayingEmbed(this.currentTrack, this)],
          components: buildControlRows(this),
        });
      } else {
        await this.controlMessage.edit({
          content: '⏹ The queue has ended.',
          embeds: [],
          components: [],
        });
      }
    } catch {
      // Message was deleted or is no longer accessible.
    }
  }

  destroy(): void {
    this.manualStop = true;
    this.player.stop(true);
    this.killYtdlp();
    const conn = getVoiceConnection(this.guildId);
    conn?.destroy();
    this.connection = null;
    this.currentTrack = null;
    this.queue = [];
  }
}
