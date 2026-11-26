import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
function check(dir) {
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${file.name}`;
    if (file.isDirectory()) check(path);
    else if (file.name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(1);
    }
  }
}
for (const dir of ['backend', 'frontend/src/js', 'scripts', 'tests']) check(dir);
console.log('Sintaxe validada.');
