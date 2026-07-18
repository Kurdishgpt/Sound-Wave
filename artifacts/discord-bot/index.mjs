// Entry point — run with: node index.mjs
// Node 22.7+ / Node 24 built-in TypeScript support, no tsx required.

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const patchPath  = resolve(__dirname, 'src/patches/udpPatch.cjs');
const entryPath  = resolve(__dirname, 'src/index.ts');
const tsxEsmPath = resolve(__dirname, 'node_modules/tsx/esm/index.js');

const args = [];

// UDP patch — Replit only, skipped when absent
if (existsSync(patchPath)) {
  args.push('--require', patchPath);
}

// TypeScript loader
if (existsSync(tsxEsmPath)) {
  args.push('--import', 'tsx/esm');
} else {
  args.push('--experimental-strip-types', '--no-warnings');
}

args.push(entryPath);

const proc = spawn(process.execPath, args, { stdio: 'inherit' });
proc.on('exit', (code) => process.exit(code ?? 0));
