import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('porta ocupada encerra com erro sem anunciar disponibilidade', { timeout: 10000 }, async () => {
  const occupied = createServer();
  occupied.listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  let child;
  try {
    child = spawn(process.execPath, ['backend/server.js'], {
      env: { ...process.env, PORT: String(occupied.address().port), HOST: '127.0.0.1' },
    });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const [code] = await once(child, 'close');
    assert.equal(code, 1);
    assert.match(output, /já está em uso/);
    assert.doesNotMatch(output, /Help Desk disponível/);
  } finally {
    child?.kill();
    await new Promise(resolve => occupied.close(resolve));
  }
});
