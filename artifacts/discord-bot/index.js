// Entry point — run with: node index.js
// Launches the bot using the tsx ESM loader so TypeScript source files are
// executed directly without a separate build step.
//
// The UDP patch (src/patches/udpPatch.cjs) is only required on Replit, where
// outbound UDP echo is blocked and @discordjs/voice IP discovery hangs.
// On a normal host it is skipped automatically if the file is not present.
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patchPath = resolve(__dirname, 'src/patches/udpPatch.cjs');
const entryPath = resolve(__dirname, 'src/index.ts');

const args = [];

if (existsSync(patchPath)) {
  args.push('--require', patchPath);
}

args.push('--import', 'tsx/esm', entryPath);

const proc = spawn(process.execPath, args, { stdio: 'inherit' });

proc.on('exit', (code) => process.exit(code ?? 0));
