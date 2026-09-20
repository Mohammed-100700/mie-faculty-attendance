import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (options.capture) process.stderr.write(result.stderr || result.stdout || '');
    process.exit(result.status ?? 1);
  }
  return options.capture ? (result.stdout || '').trim() : '';
}

run('git', ['diff', '--check', 'HEAD', '--']);

const tracked = run('git', ['diff', '--name-only', 'HEAD', '--'], { capture: true })
  .split(/\r?\n/)
  .filter(Boolean);
const untrackedOutput = run('git', ['ls-files', '--others', '--exclude-standard'], { capture: true });
const untracked = untrackedOutput.split(/\r?\n/).filter(Boolean);
const changed = [...new Set([...tracked, ...untracked])].sort();

console.log('changed files:');
changed.forEach((file) => console.log(`  ${file}`));
if (changed.length === 0) console.log('  none');

const backendJavaScript = changed.filter(
  (file) => file.startsWith('backend/') && /\.(cjs|mjs|js)$/.test(file) && existsSync(path.join(root, file)),
);
for (const file of backendJavaScript) {
  run(process.execPath, ['--check', path.join(root, file)]);
}

if (changed.some((file) => file.startsWith('frontend/'))) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  run(npm, ['run', 'build'], { cwd: path.join(root, 'frontend') });
}

console.log('static gate: PASS');
