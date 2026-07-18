var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/types.ts
var init_types = __esm({
  "src/types.ts"() {
    "use strict";
  }
});

// src/utils/embeds.ts
var embeds_exports = {};
__export(embeds_exports, {
  buildAddedEmbed: () => buildAddedEmbed,
  buildNowPlayingEmbed: () => buildNowPlayingEmbed,
  buildQueueEmbed: () => buildQueueEmbed
});
import { EmbedBuilder } from "discord.js";
function progressBar(current = 0, total = 1, length = 15) {
  const filled = Math.round(current / total * length);
  return "\u25AC".repeat(filled) + "\u{1F518}" + "\u25AC".repeat(length - filled);
}
function loopLabel(mode) {
  if (mode === "track" /* TRACK */) return "\u{1F502} Track";
  if (mode === "queue" /* QUEUE */) return "\u{1F501} Queue";
  return "Off";
}
function sourceLabel(source) {
  return source === "spotify" ? "\u{1F3B5} Spotify" : "\u25B6\uFE0F YouTube";
}
function buildNowPlayingEmbed(track, player) {
  const bar = progressBar(0, 1, 15);
  const volumeStr = player.muted ? "\u{1F507} Muted" : `\u{1F50A} ${player.volume}%`;
  const loopStr = loopLabel(player.loopMode);
  const embed = new EmbedBuilder().setColor(COLOR_PLAYING).setAuthor({ name: "\u25B6  Now Playing" }).setTitle(track.title).setURL(track.url).setDescription(
    [
      track.artist ? `**${track.artist}**` : "",
      "",
      `${bar}`,
      `\`0:00\` / \`${track.durationFormatted}\``
    ].filter((l) => l !== void 0).join("\n")
  ).addFields(
    { name: "Source", value: sourceLabel(track.source ?? "youtube"), inline: true },
    { name: "Volume", value: volumeStr, inline: true },
    { name: "Loop", value: loopStr, inline: true },
    { name: "Requested by", value: `<@${track.requestedBy}>`, inline: true }
  ).setFooter({ text: player.queue.length > 0 ? `${player.queue.length} track${player.queue.length === 1 ? "" : "s"} in queue` : "Queue is empty" });
  if (track.thumbnail) {
    embed.setImage(track.thumbnail);
  }
  return embed;
}
function buildQueueEmbed(player) {
  const embed = new EmbedBuilder().setColor(COLOR_QUEUE).setTitle("\u{1F4CB}  Queue");
  if (!player.currentTrack) {
    return embed.setDescription("Nothing is playing right now.");
  }
  const nowLine = `**Now Playing**
[${player.currentTrack.title}](${player.currentTrack.url}) \`${player.currentTrack.durationFormatted}\``;
  if (player.queue.length === 0) {
    return embed.setDescription(`${nowLine}

*Queue is empty*`);
  }
  const list = player.queue.slice(0, 10).map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) \`${t.durationFormatted}\` \u2014 <@${t.requestedBy}>`).join("\n");
  embed.setDescription(`${nowLine}

${list}`);
  if (player.queue.length > 10) {
    embed.setFooter({ text: `\u2026and ${player.queue.length - 10} more tracks` });
  }
  return embed;
}
function buildAddedEmbed(track, queued) {
  const embed = new EmbedBuilder().setColor(queued ? COLOR_QUEUED : COLOR_PLAYING).setAuthor({ name: queued ? "\u{1F4CB}  Added to Queue" : "\u25B6  Now Playing" }).setTitle(track.title).setURL(track.url).addFields(
    { name: "\u23F1 Duration", value: track.durationFormatted, inline: true },
    { name: "\u{1F3A4} Artist", value: track.artist ?? "Unknown", inline: true },
    { name: "\u{1F4E1} Source", value: sourceLabel(track.source ?? "youtube"), inline: true }
  );
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}
var COLOR_PLAYING, COLOR_QUEUED, COLOR_QUEUE;
var init_embeds = __esm({
  "src/utils/embeds.ts"() {
    "use strict";
    init_types();
    COLOR_PLAYING = 10181046;
    COLOR_QUEUED = 2895667;
    COLOR_QUEUE = 2303786;
  }
});

// src/index.ts
import { createRequire } from "module";
import { Client, GatewayIntentBits, Events } from "discord.js";
import play4 from "play-dl";

// src/handlers/ready.ts
import { REST, Routes } from "discord.js";

// src/commands/playContext.ts
import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  GuildMember
} from "discord.js";

// src/music/MusicPlayer.ts
init_types();
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection
} from "@discordjs/voice";

// src/music/search.ts
import play from "play-dl";
import { spawn } from "child_process";
import { StreamType } from "@discordjs/voice";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import { writeFileSync } from "fs";
var __dirname = dirname(fileURLToPath(import.meta.url));
var YOUTUBE_DL_PATH = resolve(__dirname, "../../bin/yt-dlp");
var COOKIES_PATH = "/tmp/yt-cookies.txt";
var cookiesContent = null;
function initCookies() {
  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw) return;
  let content = raw.trim();
  if (!content.startsWith("#")) {
    try {
      const decoded = Buffer.from(content, "base64").toString("utf-8");
      if (decoded.startsWith("#")) content = decoded;
    } catch {
    }
  }
  if (!content.startsWith("# Netscape HTTP Cookie File") && !content.startsWith("# HTTP Cookie File")) {
    console.warn("[yt-dlp] YOUTUBE_COOKIES does not look like a valid Netscape cookies file \u2014 cookies disabled. Make sure you exported cookies.txt from your browser (not base64-encoded).");
    return;
  }
  cookiesContent = content;
  console.log("[yt-dlp] Cookies loaded from YOUTUBE_COOKIES secret");
}
function refreshCookies() {
  if (!cookiesContent) return false;
  try {
    writeFileSync(COOKIES_PATH, cookiesContent, { mode: 384 });
    return true;
  } catch (err) {
    console.warn("[yt-dlp] Failed to write cookies file:", err.message);
    return false;
  }
}
initCookies();
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
async function searchTracks(query, limit = 5) {
  try {
    const results = await play.search(query, { source: { youtube: "video" }, limit });
    return results.map((v) => ({
      title: v.title ?? "Unknown",
      url: v.url,
      thumbnail: v.thumbnails?.[0]?.url,
      duration: v.durationInSec,
      durationFormatted: v.durationRaw || formatDuration(v.durationInSec),
      requestedBy: "",
      requestedByName: "",
      source: "youtube",
      artist: v.channel?.name
    }));
  } catch {
    return [];
  }
}
async function resolveUrl(url, requestedBy, requestedByName) {
  try {
    const ytVal = play.yt_validate(url);
    if (ytVal === "video") {
      const info = await play.video_info(url);
      const d = info.video_details;
      return {
        title: d.title ?? "Unknown",
        url: d.url,
        thumbnail: d.thumbnails?.[0]?.url,
        duration: d.durationInSec,
        durationFormatted: d.durationRaw || formatDuration(d.durationInSec),
        requestedBy,
        requestedByName,
        source: "youtube",
        artist: d.channel?.name
      };
    }
    const spVal = play.sp_validate(url);
    if (spVal === "track") {
      const sp = await play.spotify(url);
      if (sp.type !== "track") return null;
      const t = sp;
      const searchQuery = `${t.name} ${t.artists?.[0]?.name ?? ""}`.trim();
      const results = await play.search(searchQuery, { source: { youtube: "video" }, limit: 1 });
      if (!results[0]) return null;
      const v = results[0];
      return {
        title: `${t.name} - ${t.artists?.[0]?.name ?? ""}`,
        url: v.url,
        thumbnail: t.thumbnail?.url ?? v.thumbnails?.[0]?.url,
        duration: v.durationInSec,
        durationFormatted: v.durationRaw || formatDuration(v.durationInSec),
        requestedBy,
        requestedByName,
        source: "spotify",
        artist: t.artists?.[0]?.name
      };
    }
    if (spVal === "playlist" || spVal === "album") {
      const sp = await play.spotify(url);
      const spAny = sp;
      const tracks = [];
      const items = spAny.fetched_tracks?.get("1") ?? [];
      for (const item of items.slice(0, 50)) {
        const t = item;
        const q = `${t.name} ${t.artists?.[0]?.name ?? ""}`.trim();
        const res = await play.search(q, { source: { youtube: "video" }, limit: 1 });
        if (res[0]) {
          tracks.push({
            title: `${t.name} - ${t.artists?.[0]?.name ?? ""}`,
            url: res[0].url,
            thumbnail: t.thumbnail?.url ?? res[0].thumbnails?.[0]?.url,
            duration: res[0].durationInSec,
            durationFormatted: res[0].durationRaw || formatDuration(res[0].durationInSec),
            requestedBy,
            requestedByName,
            source: "spotify",
            artist: t.artists?.[0]?.name
          });
        }
      }
      return tracks[0] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
async function searchByQuery(query, requestedBy, requestedByName) {
  try {
    const results = await play.search(query, { source: { youtube: "video" }, limit: 1 });
    if (!results[0]) return null;
    const v = results[0];
    return {
      title: v.title ?? "Unknown",
      url: v.url,
      thumbnail: v.thumbnails?.[0]?.url,
      duration: v.durationInSec,
      durationFormatted: v.durationRaw || formatDuration(v.durationInSec),
      requestedBy,
      requestedByName,
      source: "youtube",
      artist: v.channel?.name
    };
  } catch {
    return null;
  }
}
async function getSuggestions(track) {
  const query = track.artist ? `${track.artist} music` : track.title;
  return searchTracks(query, 5);
}
function getAudioStream(url) {
  const args = [
    url,
    "--no-playlist",
    "-f",
    "251/250/249/bestaudio[ext=webm]/18/bestaudio",
    "--audio-quality",
    "0",
    "--no-warnings",
    "-o",
    "-",
    "--quiet"
  ];
  if (refreshCookies()) {
    args.splice(1, 0, "--cookies", COOKIES_PATH);
  }
  const proc = spawn(YOUTUBE_DL_PATH, args);
  proc.on("error", (err) => {
    console.error("[yt-dlp] Failed to spawn process:", err.message);
  });
  proc.stderr.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg && !msg.includes("Broken pipe")) console.error("[yt-dlp]", msg);
  });
  proc.stdout.on("error", () => {
  });
  return { stream: proc.stdout, type: StreamType.Arbitrary, process: proc };
}

// src/music/MusicPlayer.ts
init_embeds();

// src/utils/components.ts
init_types();
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
function buildControlRows(player) {
  const isPaused = player.isPaused();
  const loopMode = player.loopMode;
  const isMuted = player.muted;
  const isLiked = player.currentTrack ? player.likedTracks.has(player.currentTrack.url) : false;
  const loopEmoji = loopMode === "track" /* TRACK */ ? "\u{1F502}" : "\u{1F501}";
  const loopStyle = loopMode !== "none" /* NONE */ ? ButtonStyle.Primary : ButtonStyle.Secondary;
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_suggest").setLabel("Select a suggested song").setEmoji("\u{1F3B5}").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_queue_btn").setEmoji("\u{1F4CB}").setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_resume").setEmoji("\u25B6\uFE0F").setStyle(isPaused ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(!isPaused),
    new ButtonBuilder().setCustomId("music_prev").setEmoji("\u23EE").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_pause").setEmoji("\u23F8").setStyle(!isPaused ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(isPaused),
    new ButtonBuilder().setCustomId("music_skip").setEmoji("\u23ED").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_loop").setEmoji(loopEmoji).setStyle(loopStyle)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_mute").setEmoji(isMuted ? "\u{1F507}" : "\u{1F508}").setStyle(isMuted ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_rewind").setEmoji("\u23EA").setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("music_like").setEmoji(isLiked ? "\u2764\uFE0F" : "\u{1F90D}").setStyle(isLiked ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_forward").setEmoji("\u23E9").setStyle(ButtonStyle.Secondary).setDisabled(true)
  );
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_vol_down").setEmoji("\u{1F509}").setStyle(ButtonStyle.Secondary)
  );
  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("music_vol_up").setEmoji("\u{1F50A}").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_shuffle").setEmoji("\u{1F500}").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_stop").setEmoji("\u2716\uFE0F").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("music_vol_down2").setEmoji("\u{1F509}").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_disconnect").setEmoji("\u{1F50C}").setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2, row3, row4, row5];
}
function buildSuggestionSelect(suggestions) {
  const options = suggestions.map(
    (t) => new StringSelectMenuOptionBuilder().setLabel(t.title.slice(0, 100)).setValue(t.url).setDescription(
      `${t.artist ?? "Unknown"} \u2022 ${t.source} \u2022 ${t.durationFormatted}`.slice(0, 100)
    ).setEmoji(t.source === "spotify" ? "\u{1F3B5}" : "\u25B6\uFE0F")
  );
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId("music_suggestion_select").setPlaceholder("Select a suggested song...").addOptions(options)
  );
}

// src/music/MusicPlayer.ts
var MusicPlayer = class {
  queue = [];
  currentTrack = null;
  loopMode = "none" /* NONE */;
  volume = 100;
  muted = false;
  likedTracks = /* @__PURE__ */ new Set();
  history = [];
  controlMessage = null;
  player;
  connection = null;
  resource = null;
  guildId;
  /** Set to true before a manual stop() to prevent the Idle handler re-advancing the queue. */
  manualStop = false;
  /** Active yt-dlp child process — killed on skip/stop to avoid broken pipe errors. */
  ytdlpProcess = null;
  /** Monotonic counter guarding against stale async playTrack() completions overriding newer playback. */
  playGeneration = 0;
  /** Last playback error to show in the control message instead of "queue ended". Cleared on new track. */
  lastError = null;
  constructor(guildId) {
    this.guildId = guildId;
    this.player = createAudioPlayer();
    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.manualStop) {
        this.manualStop = false;
        return;
      }
      if (this.loopMode === "track" /* TRACK */ && this.currentTrack) {
        this.playTrack(this.currentTrack);
        return;
      }
      if (this.currentTrack) {
        this.history.push(this.currentTrack);
        if (this.loopMode === "queue" /* QUEUE */) {
          this.queue.push(this.currentTrack);
        }
        this.currentTrack = null;
      }
      this.advanceQueue();
    });
    this.player.on("error", (err) => {
      console.error("[MusicPlayer] Audio error:", err.message);
      this.manualStop = false;
      this.advanceQueue();
    });
  }
  // ── private helpers ────────────────────────────────────────────────────────
  async playTrack(track) {
    const generation = ++this.playGeneration;
    this.lastError = null;
    try {
      this.currentTrack = track;
      const stream = getAudioStream(track.url);
      if (generation !== this.playGeneration) {
        stream.process.kill("SIGKILL");
        return;
      }
      this.killYtdlp();
      this.ytdlpProcess = stream.process;
      stream.process.once("close", (code) => {
        if (code !== 0 && code !== null) {
          console.error(`[MusicPlayer] yt-dlp exited with code ${code} for "${track.title}"`);
          if (generation === this.playGeneration) {
            this.lastError = `\u274C Couldn't play **${track.title}** \u2014 YouTube blocked the request. Try a different track or add your cookies via the \`YOUTUBE_COOKIES\` secret.`;
          }
        }
      });
      this.resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });
      this.applyVolume();
      this.player.play(this.resource);
      console.log(`[MusicPlayer] Now playing "${track.title}" (guild ${this.guildId})`);
    } catch (err) {
      if (generation !== this.playGeneration) return;
      console.error("[MusicPlayer] Failed to play track:", err);
      this.lastError = `\u274C Couldn't play **${track.title}** \u2014 an unexpected error occurred.`;
      this.currentTrack = null;
      this.advanceQueue();
    }
  }
  killYtdlp() {
    if (this.ytdlpProcess && !this.ytdlpProcess.killed) {
      this.ytdlpProcess.kill("SIGKILL");
    }
    this.ytdlpProcess = null;
  }
  applyVolume() {
    if (this.resource?.volume) {
      this.resource.volume.setVolume(this.muted ? 0 : this.volume / 100);
    }
  }
  advanceQueue() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.playTrack(next).then(() => this.refreshMessage());
    } else {
      this.currentTrack = null;
      this.refreshMessage();
    }
  }
  // ── public API ─────────────────────────────────────────────────────────────
  async join(channel) {
    const existing = getVoiceConnection(this.guildId);
    if (existing) {
      this.connection = existing;
    } else {
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: this.guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        // selfDeaf: bot doesn't need to receive audio — saves bandwidth for encoding.
        selfDeaf: true
      });
      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(this.connection, VoiceConnectionStatus.Signalling, 5e3),
            entersState(this.connection, VoiceConnectionStatus.Connecting, 5e3)
          ]);
        } catch {
          this.destroy();
        }
      });
      this.connection.on("error", (err) => {
        console.error("[MusicPlayer] Voice connection error:", err.message);
      });
      this.connection.on("stateChange", (oldState, newState) => {
        console.log(`[MusicPlayer] Voice connection state: ${oldState.status} -> ${newState.status}`);
      });
    }
    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 15e3);
    } catch (err) {
      console.error("[MusicPlayer] Voice connection failed to become ready:", err);
      throw new Error("Failed to connect to the voice channel. Please try again.");
    }
    this.connection.subscribe(this.player);
  }
  /** Add a track. Returns true if it started playing immediately, false if queued. */
  async enqueue(track) {
    if (!this.currentTrack && this.queue.length === 0) {
      await this.playTrack(track);
      return true;
    }
    this.queue.push(track);
    return false;
  }
  pause() {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      return true;
    }
    return false;
  }
  resume() {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return true;
    }
    return false;
  }
  /** Skip current track. State mutations happen in the Idle handler, not here. */
  skip() {
    this.player.stop();
    this.killYtdlp();
  }
  hasPrevious() {
    return this.history.length > 0;
  }
  previous() {
    if (this.history.length === 0) return;
    const prev = this.history.pop();
    if (this.currentTrack) this.queue.unshift(this.currentTrack);
    this.currentTrack = null;
    this.manualStop = true;
    this.player.stop(true);
    this.killYtdlp();
    this.playTrack(prev).then(() => this.refreshMessage());
  }
  stop() {
    this.queue = [];
    this.currentTrack = null;
    this.manualStop = true;
    this.player.stop(true);
    this.killYtdlp();
    this.refreshMessage();
  }
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(200, vol));
    this.applyVolume();
  }
  adjustVolume(delta) {
    this.setVolume(this.volume + delta);
  }
  toggleMute() {
    this.muted = !this.muted;
    this.applyVolume();
  }
  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }
  cycleLoop() {
    if (this.loopMode === "none" /* NONE */) this.loopMode = "track" /* TRACK */;
    else if (this.loopMode === "track" /* TRACK */) this.loopMode = "queue" /* QUEUE */;
    else this.loopMode = "none" /* NONE */;
    return this.loopMode;
  }
  /** Toggle like state. Returns new liked state. */
  toggleLike(url) {
    if (this.likedTracks.has(url)) {
      this.likedTracks.delete(url);
      return false;
    }
    this.likedTracks.add(url);
    return true;
  }
  isPaused() {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }
  isActive() {
    return this.currentTrack !== null || this.player.state.status === AudioPlayerStatus.Playing || this.player.state.status === AudioPlayerStatus.Paused;
  }
  async refreshMessage() {
    if (!this.controlMessage) return;
    try {
      if (this.currentTrack) {
        await this.controlMessage.edit({
          embeds: [buildNowPlayingEmbed(this.currentTrack, this)],
          components: buildControlRows(this)
        });
      } else if (this.lastError) {
        const msg = this.lastError;
        this.lastError = null;
        await this.controlMessage.edit({
          content: msg,
          embeds: [],
          components: []
        });
      } else {
        await this.controlMessage.edit({
          content: "\u23F9 The queue has ended.",
          embeds: [],
          components: []
        });
      }
    } catch {
    }
  }
  destroy() {
    this.manualStop = true;
    this.lastError = null;
    this.player.stop(true);
    this.killYtdlp();
    const conn = getVoiceConnection(this.guildId);
    conn?.destroy();
    this.connection = null;
    this.currentTrack = null;
    this.queue = [];
  }
};

// src/music/PlayerManager.ts
var players = /* @__PURE__ */ new Map();
function getPlayer(guildId) {
  let player = players.get(guildId);
  if (!player) {
    player = new MusicPlayer(guildId);
    players.set(guildId, player);
  }
  return player;
}

// src/commands/playContext.ts
init_embeds();
import play2 from "play-dl";
var data = new ContextMenuCommandBuilder().setName("\u25B6\uFE0F Play").setType(ApplicationCommandType.Message);
var URL_RE = /https?:\/\/[^\s]+/i;
async function execute(interaction) {
  await interaction.deferReply();
  const member = interaction.member instanceof GuildMember ? interaction.member : null;
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel) {
    await interaction.editReply({ content: "\u274C Join a voice channel first!" });
    return;
  }
  const msgContent = interaction.targetMessage.content;
  const urlMatch = msgContent.match(URL_RE);
  const query = urlMatch ? urlMatch[0] : msgContent.trim();
  if (!query) {
    await interaction.editReply({ content: "\u274C The message has no text or URL to play." });
    return;
  }
  const player = getPlayer(interaction.guildId);
  let track = null;
  if (urlMatch) {
    const ytVal = play2.yt_validate(query);
    const spVal = play2.sp_validate(query);
    if (ytVal === "video" || spVal === "track" || spVal === "album" || spVal === "playlist") {
      track = await resolveUrl(query, interaction.user.id, interaction.user.username);
    }
  }
  if (!track) {
    track = await searchByQuery(query, interaction.user.id, interaction.user.username);
  }
  if (!track) {
    await interaction.editReply({ content: "\u274C Could not find anything to play from that message." });
    return;
  }
  track.requestedBy = interaction.user.id;
  track.requestedByName = interaction.user.username;
  await player.join(voiceChannel);
  const playingNow = await player.enqueue(track);
  if (playingNow) {
    const msg = await interaction.editReply({
      embeds: [buildNowPlayingEmbed(track, player)],
      components: buildControlRows(player)
    });
    player.controlMessage = msg;
  } else {
    await interaction.editReply({ embeds: [buildAddedEmbed(track, true)] });
    await player.refreshMessage();
  }
}

// src/commands/play.ts
import {
  SlashCommandBuilder
} from "discord.js";
init_embeds();
import play3 from "play-dl";
var data2 = new SlashCommandBuilder().setName("play").setDescription("\u25B6\uFE0F Play a song from YouTube or Spotify").addStringOption(
  (opt) => opt.setName("query").setDescription("Song name, YouTube URL, or Spotify URL").setRequired(true).setAutocomplete(true)
);
async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  if (!focused || focused.length < 2) {
    await interaction.respond([]).catch(() => null);
    return;
  }
  try {
    const results = await Promise.race([
      searchTracks(focused, 5),
      new Promise((_, reject) => setTimeout(() => reject(new Error("autocomplete timeout")), 2500))
    ]);
    await interaction.respond(
      results.map((t) => ({
        name: `${t.title}${t.artist ? ` \u2014 ${t.artist}` : ""} [${t.durationFormatted}]`.slice(
          0,
          100
        ),
        value: t.url
      }))
    );
  } catch {
    await interaction.respond([]).catch(() => null);
  }
}
async function execute2(interaction) {
  await interaction.deferReply();
  const member = interaction.member;
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await interaction.editReply({ content: "\u274C You need to be in a voice channel first!" });
    return;
  }
  const query = interaction.options.getString("query", true);
  const player = getPlayer(interaction.guildId);
  let track = null;
  if (query.startsWith("http")) {
    const ytVal = play3.yt_validate(query);
    const spVal = play3.sp_validate(query);
    if (ytVal === "video" || spVal === "track" || spVal === "album" || spVal === "playlist") {
      track = await resolveUrl(query, interaction.user.id, interaction.user.username);
    }
  }
  if (!track) {
    track = await searchByQuery(query, interaction.user.id, interaction.user.username);
  }
  if (!track) {
    await interaction.editReply({
      content: "\u274C Could not find that song. Try a different query!"
    });
    return;
  }
  track.requestedBy = interaction.user.id;
  track.requestedByName = interaction.user.username;
  await player.join(voiceChannel);
  const playingNow = await player.enqueue(track);
  if (playingNow) {
    const msg = await interaction.editReply({
      embeds: [buildNowPlayingEmbed(track, player)],
      components: buildControlRows(player)
    });
    player.controlMessage = msg;
  } else {
    await interaction.editReply({
      embeds: [buildAddedEmbed(track, true)]
    });
    await player.refreshMessage();
  }
}

// src/commands/queue.ts
import {
  SlashCommandBuilder as SlashCommandBuilder2,
  MessageFlags as MessageFlags3
} from "discord.js";
init_embeds();
var data3 = new SlashCommandBuilder2().setName("queue").setDescription("\u{1F4CB} Show the current music queue");
async function execute3(interaction) {
  const player = getPlayer(interaction.guildId);
  const embed = buildQueueEmbed(player);
  await interaction.reply({ embeds: [embed], flags: MessageFlags3.Ephemeral });
}

// src/commands/controls.ts
import {
  SlashCommandBuilder as SlashCommandBuilder3,
  MessageFlags as MessageFlags4
} from "discord.js";
init_types();
var skipData = new SlashCommandBuilder3().setName("skip").setDescription("\u23ED Skip the current song");
async function skipExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  if (!player.isActive()) {
    await interaction.reply({ content: "\u274C Nothing is playing.", flags: MessageFlags4.Ephemeral });
    return;
  }
  player.skip();
  await interaction.reply({ content: "\u23ED Skipped!", flags: MessageFlags4.Ephemeral });
}
var stopData = new SlashCommandBuilder3().setName("stop").setDescription("\u23F9 Stop playback and clear the queue");
async function stopExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  player.stop();
  await interaction.reply({ content: "\u23F9 Stopped and cleared the queue.", flags: MessageFlags4.Ephemeral });
}
var pauseData = new SlashCommandBuilder3().setName("pause").setDescription("\u23F8 Pause the current song");
async function pauseExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  const ok = player.pause();
  await interaction.reply({
    content: ok ? "\u23F8 Paused." : "\u274C Nothing is playing.",
    flags: MessageFlags4.Ephemeral
  });
  if (ok) await player.refreshMessage();
}
var resumeData = new SlashCommandBuilder3().setName("resume").setDescription("\u25B6\uFE0F Resume a paused song");
async function resumeExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  const ok = player.resume();
  await interaction.reply({
    content: ok ? "\u25B6\uFE0F Resumed." : "\u274C Not paused.",
    flags: MessageFlags4.Ephemeral
  });
  if (ok) await player.refreshMessage();
}
var volumeData = new SlashCommandBuilder3().setName("volume").setDescription("\u{1F50A} Set the playback volume").addIntegerOption(
  (opt) => opt.setName("level").setDescription("Volume level (0\u2013200)").setRequired(true).setMinValue(0).setMaxValue(200)
);
async function volumeExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  const level = interaction.options.getInteger("level", true);
  player.setVolume(level);
  await interaction.reply({
    content: `\u{1F50A} Volume set to **${level}%**`,
    flags: MessageFlags4.Ephemeral
  });
  await player.refreshMessage();
}
var loopData = new SlashCommandBuilder3().setName("loop").setDescription("\u{1F501} Set loop mode").addStringOption(
  (opt) => opt.setName("mode").setDescription("Loop mode").setRequired(true).addChoices(
    { name: "\u27A1\uFE0F Off", value: "none" /* NONE */ },
    { name: "\u{1F502} Track", value: "track" /* TRACK */ },
    { name: "\u{1F501} Queue", value: "queue" /* QUEUE */ }
  )
);
async function loopExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  const mode = interaction.options.getString("mode", true);
  player.loopMode = mode;
  const labels = {
    ["none" /* NONE */]: "\u27A1\uFE0F Loop disabled.",
    ["track" /* TRACK */]: "\u{1F502} Looping current track.",
    ["queue" /* QUEUE */]: "\u{1F501} Looping entire queue."
  };
  await interaction.reply({ content: labels[mode], flags: MessageFlags4.Ephemeral });
  await player.refreshMessage();
}
var shuffleData = new SlashCommandBuilder3().setName("shuffle").setDescription("\u{1F500} Shuffle the queue");
async function shuffleExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  if (player.queue.length < 2) {
    await interaction.reply({ content: "\u274C Not enough songs in the queue to shuffle.", flags: MessageFlags4.Ephemeral });
    return;
  }
  player.shuffle();
  await interaction.reply({ content: `\u{1F500} Shuffled **${player.queue.length}** tracks!`, flags: MessageFlags4.Ephemeral });
  await player.refreshMessage();
}
var nowplayingData = new SlashCommandBuilder3().setName("nowplaying").setDescription("\u{1F3B5} Show the currently playing song");
async function nowplayingExecute(interaction) {
  const player = getPlayer(interaction.guildId);
  if (!player.currentTrack) {
    await interaction.reply({ content: "\u274C Nothing is playing.", flags: MessageFlags4.Ephemeral });
    return;
  }
  const { buildNowPlayingEmbed: buildNowPlayingEmbed2 } = await Promise.resolve().then(() => (init_embeds(), embeds_exports));
  const msg = await interaction.reply({
    embeds: [buildNowPlayingEmbed2(player.currentTrack, player)],
    components: buildControlRows(player),
    fetchReply: true
  });
  player.controlMessage = msg;
}

// src/commands/index.ts
var commands = [
  // ── Message context menu ───────────────────────────────────────────────────
  {
    kind: "contextMenu",
    data,
    execute
  },
  // ── Slash commands ──────────────────────────────────────────────────────────
  { kind: "slash", data: data2, execute: execute2, autocomplete },
  { kind: "slash", data: data3, execute: execute3 },
  { kind: "slash", data: skipData, execute: skipExecute },
  { kind: "slash", data: stopData, execute: stopExecute },
  { kind: "slash", data: pauseData, execute: pauseExecute },
  { kind: "slash", data: resumeData, execute: resumeExecute },
  { kind: "slash", data: volumeData, execute: volumeExecute },
  { kind: "slash", data: loopData, execute: loopExecute },
  { kind: "slash", data: shuffleData, execute: shuffleExecute },
  { kind: "slash", data: nowplayingData, execute: nowplayingExecute }
];

// src/handlers/ready.ts
async function onReady(client) {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) {
    console.error("[Bot] Missing DISCORD_TOKEN or DISCORD_CLIENT_ID");
    return;
  }
  try {
    const rest = new REST().setToken(token);
    const body = commands.map((c) => c.data.toJSON());
    await rest.put(Routes.applicationCommands(clientId), { body });
    const slashCount = commands.filter((c) => c.kind === "slash").length;
    const menuCount = commands.filter((c) => c.kind === "contextMenu").length;
    console.log(`[Bot] Registered ${slashCount} slash + ${menuCount} context-menu command(s) globally`);
  } catch (err) {
    console.error("[Bot] Failed to register commands:", err);
  }
}

// src/handlers/interactionCreate.ts
import {
  GuildMember as GuildMember3,
  MessageFlags as MessageFlags5
} from "discord.js";
init_embeds();
function getMemberVoiceChannel(interaction) {
  const member = interaction.member instanceof GuildMember3 ? interaction.member : null;
  return member?.voice.channel ?? null;
}
async function onInteractionCreate(interaction) {
  try {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
    } else if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isMessageContextMenuCommand()) {
      await handleContextMenu(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    console.error("[Interaction] Unhandled error:", err);
  }
}
async function handleContextMenu(interaction) {
  const cmd = commands.find(
    (c) => c.kind === "contextMenu" && c.data.name === interaction.commandName
  );
  if (!cmd) {
    await interaction.reply({ content: "\u274C Unknown command.", flags: MessageFlags5.Ephemeral });
    return;
  }
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`[ContextMenu] ${interaction.commandName}:`, err);
    const content = "\u274C An error occurred.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content }).catch(() => null);
    } else {
      await interaction.reply({ content, flags: MessageFlags5.Ephemeral }).catch(() => null);
    }
  }
}
async function handleAutocomplete(interaction) {
  const cmd = commands.find((c) => c.kind === "slash" && c.data.name === interaction.commandName);
  if (cmd?.autocomplete) {
    await cmd.autocomplete(interaction).catch(() => interaction.respond([]).catch(() => null));
  }
}
async function handleCommand(interaction) {
  const cmd = commands.find((c) => c.kind === "slash" && c.data.name === interaction.commandName);
  if (!cmd) {
    await interaction.reply({ content: "\u274C Unknown command.", flags: MessageFlags5.Ephemeral });
    return;
  }
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`[Command] /${interaction.commandName}:`, err);
    const content = "\u274C An error occurred.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content }).catch(() => null);
    } else {
      await interaction.reply({ content, flags: MessageFlags5.Ephemeral }).catch(() => null);
    }
  }
}
async function handleButton(interaction) {
  if (!interaction.guildId) return;
  const player = getPlayer(interaction.guildId);
  const memberVoice = getMemberVoiceChannel(interaction);
  if (!memberVoice) {
    await interaction.reply({ content: "\u274C Join a voice channel first!", flags: MessageFlags5.Ephemeral });
    return;
  }
  try {
    switch (interaction.customId) {
      case "music_pause": {
        const ok = player.pause();
        await interaction.reply({ content: ok ? "\u23F8 Paused." : "\u274C Not currently playing.", flags: MessageFlags5.Ephemeral });
        if (ok) await player.refreshMessage();
        break;
      }
      case "music_resume": {
        const ok = player.resume();
        await interaction.reply({ content: ok ? "\u25B6\uFE0F Resumed." : "\u274C Not paused.", flags: MessageFlags5.Ephemeral });
        if (ok) await player.refreshMessage();
        break;
      }
      case "music_skip": {
        if (!player.isActive()) {
          await interaction.reply({ content: "\u274C Nothing is playing.", flags: MessageFlags5.Ephemeral });
          break;
        }
        player.skip();
        await interaction.reply({ content: "\u23ED Skipped!", flags: MessageFlags5.Ephemeral });
        break;
      }
      case "music_prev": {
        if (!player.hasPrevious()) {
          await interaction.reply({ content: "\u274C No previous track.", flags: MessageFlags5.Ephemeral });
          break;
        }
        player.previous();
        await interaction.reply({ content: "\u23EE Going back!", flags: MessageFlags5.Ephemeral });
        break;
      }
      case "music_loop": {
        const mode = player.cycleLoop();
        const label = {
          none: "\u27A1\uFE0F Loop disabled.",
          track: "\u{1F502} Looping current track.",
          queue: "\u{1F501} Looping entire queue."
        };
        await interaction.reply({ content: label[mode] ?? "Loop updated.", flags: MessageFlags5.Ephemeral });
        await player.refreshMessage();
        break;
      }
      case "music_vol_up": {
        player.adjustVolume(10);
        await interaction.reply({ content: `\u{1F50A} Volume: **${player.volume}%**`, flags: MessageFlags5.Ephemeral });
        await player.refreshMessage();
        break;
      }
      case "music_vol_down":
      case "music_vol_down2": {
        player.adjustVolume(-10);
        await interaction.reply({ content: `\u{1F509} Volume: **${player.volume}%**`, flags: MessageFlags5.Ephemeral });
        await player.refreshMessage();
        break;
      }
      case "music_mute": {
        player.toggleMute();
        await interaction.reply({
          content: player.muted ? "\u{1F507} Muted." : `\u{1F508} Unmuted \u2014 ${player.volume}%.`,
          flags: MessageFlags5.Ephemeral
        });
        await player.refreshMessage();
        break;
      }
      case "music_like": {
        if (!player.currentTrack) {
          await interaction.reply({ content: "\u274C Nothing is playing.", flags: MessageFlags5.Ephemeral });
          break;
        }
        const liked = player.toggleLike(player.currentTrack.url);
        await interaction.reply({
          content: liked ? "\u2764\uFE0F Added to liked songs!" : "\u{1F494} Removed from liked songs.",
          flags: MessageFlags5.Ephemeral
        });
        await player.refreshMessage();
        break;
      }
      case "music_shuffle": {
        player.shuffle();
        await interaction.reply({ content: "\u{1F500} Queue shuffled!", flags: MessageFlags5.Ephemeral });
        await player.refreshMessage();
        break;
      }
      case "music_stop": {
        player.stop();
        await interaction.reply({ content: "\u23F9 Stopped and cleared the queue.", flags: MessageFlags5.Ephemeral });
        break;
      }
      case "music_disconnect": {
        player.destroy();
        await interaction.reply({ content: "\u{1F44B} Disconnected.", flags: MessageFlags5.Ephemeral });
        break;
      }
      case "music_queue_btn": {
        await interaction.reply({ embeds: [buildQueueEmbed(player)], flags: MessageFlags5.Ephemeral });
        break;
      }
      case "music_suggest": {
        if (!player.currentTrack) {
          await interaction.reply({ content: "\u274C Nothing is playing.", flags: MessageFlags5.Ephemeral });
          break;
        }
        await interaction.deferReply({ flags: MessageFlags5.Ephemeral });
        const suggestions = await getSuggestions(player.currentTrack);
        if (suggestions.length === 0) {
          await interaction.editReply({ content: "\u274C Could not fetch suggestions right now." });
          break;
        }
        await interaction.editReply({
          content: "**Select a suggested song:**",
          components: [buildSuggestionSelect(suggestions)]
        });
        break;
      }
      default:
        await interaction.reply({ content: "\u2753 Unknown action.", flags: MessageFlags5.Ephemeral });
    }
  } catch (err) {
    console.error(`[Button] ${interaction.customId}:`, err);
    const content = "\u274C Something went wrong.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content }).catch(() => null);
    } else {
      await interaction.reply({ content, flags: MessageFlags5.Ephemeral }).catch(() => null);
    }
  }
}
async function handleSelect(interaction) {
  if (!interaction.guildId) return;
  if (interaction.customId !== "music_suggestion_select") return;
  const memberVoice = getMemberVoiceChannel(interaction);
  if (!memberVoice) {
    await interaction.reply({ content: "\u274C Join a voice channel first!", flags: MessageFlags5.Ephemeral });
    return;
  }
  try {
    await interaction.deferReply({ flags: MessageFlags5.Ephemeral });
    const url = interaction.values[0];
    const track = await searchByQuery(url, interaction.user.id, interaction.user.username);
    if (!track) {
      await interaction.editReply({ content: "\u274C Could not load that track." });
      return;
    }
    const player = getPlayer(interaction.guildId);
    await player.join(memberVoice);
    const playingNow = await player.enqueue(track);
    if (playingNow) {
      const msg = await interaction.editReply({
        embeds: [buildNowPlayingEmbed(track, player)],
        components: buildControlRows(player)
      });
      player.controlMessage = msg;
    } else {
      await interaction.editReply({
        content: `\u{1F4CB} **${track.title}** added to queue (position ${player.queue.length}).`
      });
      await player.refreshMessage();
    }
  } catch (err) {
    console.error("[Select] suggestion_select:", err);
    const msg = { content: "\u274C Something went wrong." };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => null);
    } else {
      await interaction.reply({ ...msg, flags: MessageFlags5.Ephemeral }).catch(() => null);
    }
  }
}

// src/index.ts
var _require = createRequire(import.meta.url);
var _ffmpegPath = _require("ffmpeg-static");
if (_ffmpegPath) process.env.FFMPEG_PATH = _ffmpegPath;
async function main() {
  const token = process.env.DISCORD_TOKEN;
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!token) {
    console.error("[Bot] DISCORD_TOKEN is not set. Exiting.");
    process.exit(1);
  }
  if (spotifyClientId && spotifyClientSecret) {
    try {
      await play4.setToken({
        spotify: {
          client_id: spotifyClientId,
          client_secret: spotifyClientSecret,
          refresh_token: "",
          market: "US"
        }
      });
      console.log("[Bot] Spotify support enabled");
    } catch (err) {
      console.warn("[Bot] Spotify token setup failed \u2014 Spotify URLs may not work:", err);
    }
  } else {
    console.warn("[Bot] SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set \u2014 Spotify support disabled");
  }
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages
    ]
  });
  client.once(Events.ClientReady, () => onReady(client));
  client.on(Events.InteractionCreate, onInteractionCreate);
  client.on("error", (err) => console.error("[Discord] Client error:", err));
  client.on("warn", (msg) => console.warn("[Discord] Warning:", msg));
  process.on("SIGTERM", () => {
    console.log("[Bot] SIGTERM \u2014 shutting down\u2026");
    client.destroy();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    console.log("[Bot] SIGINT \u2014 shutting down\u2026");
    client.destroy();
    process.exit(0);
  });
  await client.login(token);
}
main().catch((err) => {
  console.error("[Bot] Fatal error:", err);
  process.exit(1);
});
