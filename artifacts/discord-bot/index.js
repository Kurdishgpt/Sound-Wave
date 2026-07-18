// Entry point — run with: node index.js
//
// Works on both Replit (tsx installed) and external hosts (Node 22.7+):
//   • If tsx is found in node_modules → uses --import tsx/esm
//   • Otherwise → uses Node's built-in --experimental-strip-types (Node 22.7+)
//
// The UDP patch is only needed on Replit where outbound UDP echo is blocked.
// It is skipped automatically when the file is not present.

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

// TypeScript loader — prefer tsx, fall back to Node's built-in strip-types
if (existsSync(tsxEsmPath)) {
  args.push('--import', 'tsx/esm');
} else {
  // Node 22.7+ / Node 24 built-in TypeScript support (no extra packages needed)
  args.push('--experimental-strip-types', '--no-warnings');
}

args.push(entryPath);

const proc = spawn(process.execPath, args, { stdio: 'inherit' });
proc.on('exit', (code) => process.exit(code ?? 0));
