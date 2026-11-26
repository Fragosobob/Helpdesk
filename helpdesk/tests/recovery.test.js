import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../backend/app.js';
import { migrate } from '../backend/database/migrate.js';
import { hashPassword } from '../backend/security/password.js';
import { validateCredentials } from '../backend/validator/auth.js';

test('cadastro rejeita caractere nulo antes de acessar o banco', () => {
  const data = { nome: 'Nome', email: 'teste@example.invalid', senha: 'senha-segura', confirmar_senha: 'senha-segura' };
  for (const field of ['nome', 'email']) assert.throws(() => validateCredentials({ ...data, [field]: '\0' + data[field] }, true));
});

test('sem banco: erro explícito, páginas privadas bloqueadas e requisições inválidas', async () => {
  const server = createApp({ env: {} }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(url + '/api/auth/csrf')).status, 503);
    assert.equal((await fetch(url + '/painel.html', { redirect: 'manual' })).status, 302);
    for (const path of ['/env/.env', '/backend/app.js', '/package.json', '/.git/config']) assert.equal((await fetch(url + path)).status, 404);
    const home = await fetch(url);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(home.headers.get('cache-control'), 'no-store');
    for (const [body, type, code] of [['{', 'application/json', 400], [JSON.stringify({ text: 'x'.repeat(70000) }), 'application/json', 413], ['{}', 'application/json; charset=invalid', 415]]) {
      const response = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': type }, body });
      assert.equal(response.status, code);
      assert.doesNotMatch(await response.text(), /stack|node_modules|password|postgres:/i);
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('dados e sessão sobrevivem ao fechamento e reabertura do PostgreSQL isolado', { timeout: 60000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'helpdesk-recovery-'));
  let db, server, store;
  const secret = 'segredo-exclusivo-do-teste-de-recuperacao';
  async function open() {
    db = new PGlite(directory);
    const pool = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(rows => rows.at(-1)) };
    await migrate(pool);
    const Store = connectPgSimple(session);
    store = new Store({ pool, tableName: 'sessoes', pruneSessionInterval: false });
    server = createApp({ pool, store, env: { SESSION_SECRET: secret, NODE_ENV: 'production', TRUST_PROXY: '1' } }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  }
  async function close() {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); server = null; }
    if (store) { await store.close(); store = null; }
    if (db) { await db.close(); db = null; }
  }
  let cookie = '', token, base;
  async function call(path, method = 'GET', body) {
    const response = await fetch(base + path, { method, headers: { Cookie: cookie, 'X-Forwarded-Proto': 'https', 'Content-Type': 'application/json', ...(token ? { 'X-CSRF-Token': token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) { assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Lax/); cookie = setCookie.split(';')[0]; }
    return response;
  }
  try {
    base = await open();
    await db.query('INSERT INTO usuarios(nome,email,senha_hash) VALUES ($1,$2,$3)', ['Teste', 'teste@example.invalid', await hashPassword('senha-segura')]);
    token = (await (await call('/api/auth/csrf')).json()).token;
    assert.equal((await call('/api/auth/login', 'POST', { email: 'teste@example.invalid', senha: 'senha-segura' })).status, 200);
    token = (await (await call('/api/auth/csrf')).json()).token;
    const result = await call('/api/chamados', 'POST', { titulo: 'Persistência', descricao: 'Depois de reiniciar', categoria: 'sistema', prioridade: 'media' });
    assert.equal(result.status, 201);
    const id = (await result.json()).chamado.id;
    await close();
    base = await open();
    assert.equal((await call('/api/auth/me')).status, 200);
    assert.equal((await (await call(`/api/chamados/${id}`)).json()).chamado.titulo, 'Persistência');
    const revokedCookie = cookie;
    assert.equal((await call('/api/auth/logout', 'POST', {})).status, 200);
    await close();
    base = await open();
    cookie = revokedCookie;
    assert.equal((await call('/api/auth/me')).status, 401);
  } finally { await close(); await rm(directory, { recursive: true, force: true }); }
});
