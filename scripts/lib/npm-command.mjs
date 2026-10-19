import fs from 'node:fs';
import path from 'node:path';

export function resolveNpmCommand(args, options = {}) {
  const platform = options.platform || process.platform;
  if (platform !== 'win32') return { program: 'npm', args };

  const execPath = options.execPath || process.execPath;
  const npmExecPath = options.npmExecPath || process.env.npm_execpath || '';
  const exists = options.exists || fs.existsSync;
  const candidates = [
    npmExecPath,
    path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  ].filter(Boolean);
  const npmCli = candidates.find(candidate => exists(candidate));
  if (!npmCli) throw new Error('Windows npm CLI is unavailable; refusing to report unexecuted certification steps.');
  return { program: execPath, args: [npmCli, ...args] };
}
