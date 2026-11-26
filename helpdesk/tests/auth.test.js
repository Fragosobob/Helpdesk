import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../backend/app.js';
import { migrate } from '../backend/database/migrate.js';
import { hashPassword, verifyPassword } from '../backend/security/password.js';
import { requireRole } from '../backend/security/auth.js';

test('autenticação, sessão PostgreSQL, CSRF e perfis', { timeout: 30000 }, async () => {
  const db = new PGlite();
  const pool = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)) };
  await migrate(pool);
  const Store = connectPgSimple(session);
  const store = new Store({ pool, tableName: 'sessoes', pruneSessionInterval: false });
  const app = createApp({ pool, store, env: { SESSION_SECRET: 'segredo-de-testes-isolados-com-mais-de-32-caracteres' } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '', token;
  async function call(path, body, csrf = token) {
    const response = await fetch(base + path, { redirect: 'manual', method: body ? 'POST' : 'GET', headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return response;
  }
  async function csrf() { token = (await (await call('/api/auth/csrf')).json()).token; }
  const user = { nome: 'Pessoa <teste>', email: ' TESTE@example.invalid ', senha: 'senha-teste-123', confirmar_senha: 'senha-teste-123', perfil: 'atendente' };
  try {
    assert.equal((await call('/painel-admin.html')).status, 302);
    assert.equal((await call('/api/auth/me')).status, 401);
    assert.equal((await call('/api/auth/register', user)).status, 403);
    await csrf();
    assert.equal((await call('/api/auth/register', { ...user, confirmar_senha: 'outra' })).status, 400);
    assert.equal((await call('/api/auth/register', user)).status, 201);
    assert.equal((await call('/api/auth/register', user)).status, 409);
    const stored = (await db.query('SELECT * FROM usuarios')).rows[0];
    assert.equal(stored.perfil, 'solicitante');
    assert.notEqual(stored.senha_hash, user.senha);
    assert.equal(await verifyPassword(user.senha, stored.senha_hash), true);
    assert.equal((await call('/api/auth/login', { ...user, senha: 'incorreta' })).status, 401);
    const anonymous = cookie;
    assert.equal((await call('/api/auth/login', user)).status, 200);
    assert.notEqual(cookie, anonymous);
    const authenticated = cookie;
    assert.equal((await call('/painel.html')).status, 200);
    assert.equal((await call('/painel-admin.html')).status, 403);
    const me = await (await call('/api/auth/me')).json();
    assert.equal(me.usuario.nome, user.nome);
    assert.equal(me.usuario.senha_hash, undefined);
    assert.ok((await db.query('SELECT count(*)::int AS total FROM sessoes')).rows[0].total > 0);
    assert.equal((await call('/api/auth/logout', {})).status, 403); // token anterior ao login
    await csrf();
    assert.equal((await call('/api/auth/logout', {})).status, 200);
    cookie = authenticated;
    assert.equal((await call('/api/auth/me')).status, 401);
    await db.query(`INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ($1,$2,$3,'atendente')`, ['Atendente', 'admin@example.invalid', await hashPassword(user.senha)]);
    cookie = '';
    await csrf();
    const login = await call('/api/auth/login', { email: 'admin@example.invalid', senha: user.senha });
    assert.equal((await login.json()).destino, '/painel-admin.html');
    assert.equal((await call('/painel-admin.html')).status, 200);
    assert.equal((await call('/painel.html')).status, 403);
    assert.equal((await call('/backend/database/connection.js')).status, 404);
    await csrf();
    assert.equal((await call('/api/auth/logout', {}, 'é'.repeat(64))).status, 403);
    await db.query("UPDATE sessoes SET expire=CURRENT_TIMESTAMP - INTERVAL '1 hour'");
    assert.equal((await call('/api/auth/me')).status, 401);
    await csrf();
    let limited = false;
    for (let i = 0; i < 25; i++) {
      const response = await call('/api/auth/login', { email: 'invalido', senha: '' });
      if (response.status === 429) { limited = true; break; }
    }
    assert.equal(limited, true);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await store.close(); await db.close(); }
});

test('middleware de perfil rejeita visitante e solicitante', () => {
  const middleware = requireRole('atendente');
  for (const [user, expected] of [[undefined, 401], [{ perfil: 'solicitante' }, 403]]) {
    const res = { status(code) { assert.equal(code, expected); return this; }, json() {} };
    middleware({ user }, res, () => assert.fail('Não deveria autorizar'));
  }
  let allowed = false;
  middleware({ user: { perfil: 'atendente' } }, {}, () => { allowed = true; });
  assert.equal(allowed, true);
});
