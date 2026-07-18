// run: node start.mjs
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const tsx = resolve(dir, 'node_modules/tsx/esm/index.js');
const entry = resolve(dir, 'src/index.ts');

const loader = existsSync(tsx)
  ? ['--import', 'tsx/esm']
  : ['--experimental-strip-types', '--no-warnings'];

spawn(process.execPath, [...loader, entry], { stdio: 'inherit' })
  .on('exit', c => process.exit(c ?? 0));
