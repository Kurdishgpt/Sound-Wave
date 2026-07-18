// Entry point — run with: node index.js
// Re-launches Node with the tsx ESM loader and the UDP patch so TypeScript
// source files are executed directly without a separate build step.
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const proc = spawn(
  process.execPath,
  [
    '--require', resolve(__dirname, 'src/patches/udpPatch.cjs'),
    '--import', 'tsx/esm',
    resolve(__dirname, 'src/index.ts'),
  ],
  { stdio: 'inherit' },
);

proc.on('exit', (code) => process.exit(code ?? 0));
