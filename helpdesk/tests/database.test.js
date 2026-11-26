import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { databaseConfig } from '../backend/database/connection.js';
import { migrate } from '../backend/database/migrate.js';

test('configuração exige URL e não permite TLS inseguro remoto', () => {
  assert.throws(() => databaseConfig({}), /DATABASE_URL/);
  assert.throws(() => databaseConfig({ DATABASE_URL: 'mysql://localhost/db' }), /postgres/);
  assert.throws(() => databaseConfig({ DATABASE_URL: 'postgres://example.com/db', DATABASE_SSL: 'false' }), /remotas/);
  assert.throws(() => databaseConfig({ DATABASE_URL: 'postgres://example.com/db?sslmode=no-verify' }), /parâmetros ssl/);
  assert.equal(databaseConfig({ DATABASE_URL: 'postgres://localhost/db', DATABASE_SSL: 'false' }).ssl, false);
  assert.equal(databaseConfig({ DATABASE_URL: 'postgres://example.com/db' }).ssl.rejectUnauthorized, true);
});

test('migração e integridade em PostgreSQL isolado', async () => {
  const db = new PGlite();
  // PGlite usa exec para múltiplos comandos; pg usa query sem parâmetros.
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(results => results.at(-1)) };
  try {
    assert.deepEqual(await migrate(client), ['001_initial.sql']);
    assert.deepEqual(await migrate(client), []);
    const user = await db.query(`INSERT INTO usuarios(nome, email, senha_hash)
      VALUES ($1, $2, $3) RETURNING id, perfil`, ['Teste', 'teste@example.invalid', 'hash-ficticio-apenas-teste']);
    assert.equal(user.rows[0].perfil, 'solicitante');
    const id = user.rows[0].id;
    await assert.rejects(db.query(`INSERT INTO usuarios(nome,email,senha_hash) VALUES ('Outro','teste@example.invalid','hash')`), { code: '23505' });
    await assert.rejects(db.query(`INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ('Outro','outro@example.invalid','hash','root')`), { code: '23514' });
    await assert.rejects(db.query(`INSERT INTO usuarios(nome,email,senha_hash) VALUES ('Outro','UPPER@example.invalid','hash')`), { code: '23514' });
    const ticket = await db.query(`INSERT INTO chamados(solicitante_id,titulo,descricao,categoria)
      VALUES ($1,$2,$3,$4) RETURNING *`, [id, "Teste ' SQL", 'Descrição', 'internet']);
    const ticketId = ticket.rows[0].id;
    assert.equal(ticket.rows[0].status, 'aberto');
    assert.equal(ticket.rows[0].prioridade, 'media');
    assert.equal(ticket.rows[0].titulo, "Teste ' SQL");
    await assert.rejects(db.query(`UPDATE chamados SET status='invalido' WHERE id=$1`, [ticketId]), { code: '23514' });
    await assert.rejects(db.query(`UPDATE chamados SET categoria='invalida' WHERE id=$1`, [ticketId]), { code: '23514' });
    await assert.rejects(db.query(`UPDATE chamados SET prioridade='urgente' WHERE id=$1`, [ticketId]), { code: '23514' });
    await assert.rejects(db.query(`UPDATE chamados SET titulo=' ' WHERE id=$1`, [ticketId]), { code: '23514' });
    await assert.rejects(db.query(`UPDATE chamados SET solicitante_id=9999 WHERE id=$1`, [ticketId]), { code: '23503' });
    await assert.rejects(db.query('DELETE FROM usuarios WHERE id=$1', [id]),
      error => ['23001', '23503'].includes(error.code));
    await db.query(`UPDATE chamados SET status='resolvido' WHERE id=$1`, [ticketId]);
    assert.ok((await db.query('SELECT resolvido_em FROM chamados WHERE id=$1', [ticketId])).rows[0].resolvido_em);
    await db.query(`UPDATE chamados SET status='aberto' WHERE id=$1`, [ticketId]);
    assert.equal((await db.query('SELECT resolvido_em FROM chamados WHERE id=$1', [ticketId])).rows[0].resolvido_em, null);
    await db.query(`INSERT INTO sessoes(sid,sess,expire) VALUES ($1,$2,CURRENT_TIMESTAMP + INTERVAL '1 hour')`, ['sessao-teste', JSON.stringify({ usuarioId: id })]);
    assert.equal((await db.query('SELECT sess FROM sessoes')).rows[0].sess.usuarioId, id);
    await db.query(`UPDATE schema_migrations SET checksum='alterado'`);
    await assert.rejects(migrate(client), /migração aplicada foi alterada/);
    assert.equal((await db.query('SELECT count(*)::int AS total FROM chamados')).rows[0].total, 1);
  } finally { await db.close(); }
});
