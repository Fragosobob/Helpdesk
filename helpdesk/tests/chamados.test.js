import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../backend/app.js';
import { migrate } from '../backend/database/migrate.js';
import { hashPassword } from '../backend/security/password.js';

test('fluxo de chamados: criação, isolamento, detalhes e status persistido', { timeout: 30000 }, async () => {
  const db = new PGlite();
  const pool = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)) };
  await migrate(pool);
  const hash = await hashPassword('senha-teste-123');
  for (const [name, role] of [['ana', 'solicitante'], ['bia', 'solicitante'], ['admin', 'atendente']]) {
    await db.query('INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ($1,$2,$3,$4)', [name, `${name}@example.invalid`, hash, role]);
  }
  const Store = connectPgSimple(session);
  const store = new Store({ pool, tableName: 'sessoes', pruneSessionInterval: false });
  const app = createApp({ pool, store, env: { SESSION_SECRET: 'segredo-isolado-de-testes-com-mais-de-32-caracteres' } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  function client() {
    let cookie = '', token;
    const call = async (path, method = 'GET', body, csrf = token) => {
      const res = await fetch(base + path, { method, redirect: 'manual', headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
      return res;
    };
    return { call, async login(name) {
      token = (await (await call('/api/auth/csrf')).json()).token;
      assert.equal((await call('/api/auth/login', 'POST', { email: `${name}@example.invalid`, senha: 'senha-teste-123' })).status, 200);
      token = (await (await call('/api/auth/csrf')).json()).token;
    } };
  }
  const ana = client(), bia = client(), admin = client(), guest = client();
  const payload = { titulo: "Internet <script>alert('x')</script>", descricao: 'Rede indisponível', categoria: 'internet', prioridade: 'alta', local_problema: 'Laboratório' };
  try {
    assert.equal((await guest.call('/api/chamados')).status, 401);
    assert.equal((await guest.call('/api/chamados', 'POST', payload)).status, 401);
    await ana.login('ana'); await bia.login('bia'); await admin.login('admin');
    assert.deepEqual((await (await ana.call('/api/chamados')).json()).chamados, []);
    assert.equal((await ana.call('/api/chamados', 'POST', payload, 'invalido')).status, 403);
    for (const invalid of [{ titulo: ' ' }, { titulo: 'a'.repeat(151) }, { descricao: 'a'.repeat(5001) }, { categoria: 'invalida' }, { prioridade: 'urgente' }, { local_problema: [] }, { descricao: '\0' }]) {
      assert.equal((await ana.call('/api/chamados', 'POST', { ...payload, ...invalid })).status, 400);
    }
    assert.equal((await admin.call('/api/chamados', 'POST', payload)).status, 403);
    const created = await ana.call('/api/chamados', 'POST', { ...payload, solicitante_id: 2, status: 'resolvido' });
    assert.equal(created.status, 201);
    const id = (await created.json()).chamado.id;
    const details = (await (await ana.call(`/api/chamados/${id}`)).json()).chamado;
    assert.equal(details.solicitante_id, 1);
    assert.equal(details.status, 'aberto');
    assert.equal(details.titulo, payload.titulo);
    assert.equal(details.solicitante_nome, 'ana');
    assert.equal(details.senha_hash, undefined);
    assert.equal((await bia.call(`/api/chamados/${id}`)).status, 404);
    assert.deepEqual((await (await bia.call('/api/chamados?solicitante_id=1')).json()).chamados, []);
    assert.equal((await ana.call(`/api/chamados/${id}/status`, 'PATCH', { status: 'resolvido' })).status, 403);
    assert.equal((await admin.call(`/api/chamados/${id}/status`, 'PATCH', { status: 'invalido' })).status, 400);
    assert.equal((await admin.call(`/api/chamados/${id}/status`, 'PATCH', { status: 'resolvido' }, 'invalido')).status, 403);
    for (const invalidId of ['0', '-1', 'abc', '2147483648', '1.5']) assert.equal((await ana.call(`/api/chamados/${invalidId}`)).status, 400);
    assert.equal((await admin.call('/api/chamados/9999/status', 'PATCH', { status: 'resolvido' })).status, 404);
    await bia.call('/api/chamados', 'POST', { ...payload, titulo: 'Outro chamado', local_problema: '' });
    assert.equal((await (await admin.call('/api/chamados')).json()).chamados.length, 2);
    assert.equal((await (await ana.call('/api/chamados')).json()).chamados.length, 1);
    for (const status of ['em_atendimento', 'resolvido', 'aberto']) {
      assert.equal((await admin.call(`/api/chamados/${id}/status`, 'PATCH', { status, solicitante_id: 2, titulo: 'não alterar' })).status, 200);
      const fresh = (await (await ana.call(`/api/chamados/${id}`)).json()).chamado;
      assert.equal(fresh.status, status);
      assert.equal(fresh.titulo, payload.titulo);
      assert.equal(fresh.resolvido_em !== null, status === 'resolvido');
      assert.equal((await db.query('SELECT status FROM chamados WHERE id=$1', [id])).rows[0].status, status);
    }
    const filtered = await (await admin.call('/api/chamados?busca=INTERNET&status=aberto')).json();
    assert.equal(filtered.chamados.length, 1);
    assert.equal(filtered.contadores.total, 2);
    assert.equal(filtered.contadores.aberto, 2);
    assert.equal((await (await ana.call(`/api/chamados?busca=%23${id}`)).json()).chamados[0].id, id);
    assert.equal((await (await bia.call(`/api/chamados?busca=%23${id}`)).json()).chamados.length, 0);
    assert.equal((await (await ana.call('/api/chamados?busca=INEXISTENTE')).json()).contadores.total, 1);
    assert.equal((await (await admin.call('/api/chamados?busca=%25')).json()).chamados.length, 0);
    assert.equal((await (await admin.call('/api/chamados?busca=%27%20OR%201%3D1--')).json()).chamados.length, 0);
    for (const query of ['status=errado', 'status=aberto&status=resolvido', 'busca=a&busca=b', 'busca=' + 'a'.repeat(151)]) {
      assert.equal((await ana.call('/api/chamados?' + query)).status, 400);
    }
    await admin.call(`/api/chamados/${id}/status`, 'PATCH', { status: 'resolvido' });
    const resolved = await (await admin.call('/api/chamados?status=resolvido')).json();
    assert.equal(resolved.chamados.length, 1);
    assert.equal(resolved.contadores.aberto, 1);
    assert.equal(resolved.contadores.resolvido, 1);
    // Nova sessão também enxerga os dados já gravados, sem estado do navegador.
    const freshClient = client(); await freshClient.login('ana');
    assert.equal((await (await freshClient.call(`/api/chamados/${id}`)).json()).chamado.titulo, payload.titulo);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await store.close(); await db.close(); }
});
