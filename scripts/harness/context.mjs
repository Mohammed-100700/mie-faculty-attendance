import { spawnSync } from 'node:child_process';

function git(args, allowFailure = false) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return (result.stdout || '').trimEnd();
}

const branch = git(['branch', '--show-current']);
const head = git(['log', '-1', '--oneline']);
const status = git(['status', '--short']);
const diffCheck = git(['diff', '--check', 'HEAD', '--'], true);
const unstagedStat = git(['diff', '--stat']);
const stagedStat = git(['diff', '--cached', '--stat']);

console.log(`branch: ${branch || '(detached)'}`);
console.log(`head: ${head}`);
console.log('working tree:');
console.log(status || '  clean');
console.log(`diff check: ${diffCheck ? 'FAIL' : 'PASS'}`);
if (diffCheck) console.log(diffCheck);
if (unstagedStat) console.log(`unstaged:\n${unstagedStat}`);
if (stagedStat) console.log(`staged:\n${stagedStat}`);

if (diffCheck) process.exitCode = 1;
