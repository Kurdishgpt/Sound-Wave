/**
 * udpPatch.cjs — loaded via --require before any app code.
 *
 * @discordjs/voice's performIPDiscovery sends a 74-byte UDP probe to Discord's
 * voice server and waits for the echo response to learn the bot's external IP.
 * In environments where the UDP echo is blocked or the socket hasn't bound yet,
 * this promise never resolves and the voice connection cycles back to "signalling".
 *
 * Fix: intercept the discovery probe inside dgram.createSocket, fetch the
 * external IP via HTTPS (ipify.org), then emit a correctly-formatted discovery
 * response on the socket immediately. All other UDP send() calls are passed
 * through unchanged so actual audio data flows normally.
 */
'use strict';

const dgram = require('node:dgram');
const https = require('node:https');

// ─── external-IP helper ───────────────────────────────────────────────────────

let _cachedIp = null;

function fetchExternalIp() {
  return new Promise((resolve, reject) => {
    if (_cachedIp) return resolve(_cachedIp);
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        _cachedIp = data.trim();
        resolve(_cachedIp);
      });
    }).on('error', reject);
  });
}

// Warm the cache now so it's ready by the time the first /play runs.
fetchExternalIp()
  .then(() => console.log('[UDP Patch] External IP cached for voice discovery'))
  .catch((err) => console.warn('[UDP Patch] IP pre-fetch failed (will retry on demand):', err.message));

// ─── dgram.createSocket patch ─────────────────────────────────────────────────

const _origCreate = dgram.createSocket.bind(dgram);

dgram.createSocket = function patchedCreateSocket(type, cb) {
  const socket = cb ? _origCreate(type, cb) : _origCreate(type);
  const _origSend = socket.send.bind(socket);

  socket.send = function patchedSend(buffer, portOrOffset, addressOrLength, ...rest) {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    // Discord IP-discovery probe: exactly 74 bytes, first uint16be = 1 (request).
    if (buf.length === 74 && buf.readUInt16BE(0) === 1) {
      const ssrc = buf.readUInt32BE(4);

      const respond = () => {
        fetchExternalIp()
          .then((ip) => {
            let localPort = 0;
            try { localPort = socket.address().port; } catch { /* not yet bound */ }

            console.log(`[UDP Patch] IP discovery intercepted → ${ip}:${localPort}`);

            // Build a well-formed discovery response (type=2).
            const response = Buffer.alloc(74);
            response.writeUInt16BE(2, 0);          // type  = 2 (response)
            response.writeUInt16BE(70, 2);         // length = 70
            response.writeUInt32BE(ssrc, 4);       // ssrc
            Buffer.from(ip).copy(response, 8);     // ip string, null-padded to 64 bytes
            response.writeUInt16BE(localPort, 72); // port

            // Emit on the next tick so performIPDiscovery's 'message' listener is
            // already registered by the time the event fires.
            process.nextTick(() => socket.emit('message', response));
          })
          .catch((err) => {
            console.error('[UDP Patch] Could not get external IP, falling back to real UDP:', err.message);
            _origSend(buffer, portOrOffset, addressOrLength, ...rest);
          });
      };

      // Ensure the socket is bound so address().port is available.
      try {
        socket.address(); // throws if not yet bound
        respond();
      } catch {
        socket.bind(0, respond);
      }
      return;
    }

    // All non-discovery sends (keepalives, audio RTP packets) pass through normally.
    return _origSend(buffer, portOrOffset, addressOrLength, ...rest);
  };

  return socket;
};
