/**
 * patchVoice.cjs — re-applies the performIPDiscovery HTTP patch after pnpm install.
 *
 * @discordjs/voice's performIPDiscovery sends a UDP probe and waits for the
 * echo reply to learn the bot's external IP. This fails when UDP echo is
 * blocked. The patch replaces it with an HTTPS fetch to api.ipify.org.
 *
 * Run automatically via the "postinstall" script in package.json.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VOICE_DIST = path.resolve(
  __dirname,
  '../../../node_modules/.pnpm/@discordjs+voice@0.17.0_ffmpeg-static@5.3.0_opusscript@0.0.8/node_modules/@discordjs/voice/dist/index.js',
);

const OLD = `  async performIPDiscovery(ssrc) {
    return new Promise((resolve2, reject) => {
      const listener = /* @__PURE__ */ __name((message) => {
        try {
          if (message.readUInt16BE(0) !== 2)
            return;
          const packet = parseLocalPacket(message);
          this.socket.off("message", listener);
          resolve2(packet);
        } catch {
        }
      }, "listener");
      this.socket.on("message", listener);
      this.socket.once("close", () => reject(new Error("Cannot perform IP discovery - socket closed")));
      const discoveryBuffer = import_node_buffer2.Buffer.alloc(74);
      discoveryBuffer.writeUInt16BE(1, 0);
      discoveryBuffer.writeUInt16BE(70, 2);
      discoveryBuffer.writeUInt32BE(ssrc, 4);
      this.send(discoveryBuffer);
    });
  }`;

const NEW = `  async performIPDiscovery(ssrc) {
    // Patched: bypass UDP echo round-trip by fetching external IP via HTTPS.
    return new Promise((resolve2, reject) => {
      this.socket.once("close", () => reject(new Error("Cannot perform IP discovery - socket closed")));
      const finish = (localPort) => {
        require("node:https").get("https://api.ipify.org", (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            const ip = data.trim();
            console.log("[UDP Patch] IP discovery resolved via HTTP: " + ip + ":" + localPort);
            resolve2({ ip, port: localPort });
          });
        }).on("error", (err) => {
          console.error("[UDP Patch] HTTP IP fetch failed:", err.message);
          reject(err);
        });
      };
      try {
        finish(this.socket.address().port);
      } catch {
        this.socket.bind(0, () => finish(this.socket.address().port));
      }
    });
  }`;

if (!fs.existsSync(VOICE_DIST)) {
  console.warn('[patchVoice] dist/index.js not found — skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(VOICE_DIST, 'utf8');

if (content.includes('Patched: bypass UDP echo')) {
  console.log('[patchVoice] Already patched — nothing to do');
  process.exit(0);
}

if (!content.includes(OLD)) {
  console.warn('[patchVoice] Could not find target method — patch skipped (library may have updated)');
  process.exit(0);
}

content = content.replace(OLD, NEW);
fs.writeFileSync(VOICE_DIST, content, 'utf8');
console.log('[patchVoice] performIPDiscovery patched successfully');
