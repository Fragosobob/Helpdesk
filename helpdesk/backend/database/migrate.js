import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const directory = new URL('./migrations/', import.meta.url);

// Recebe uma única conexão: transação e lock devem usar a mesma sessão.
export async function migrate(client) {
  const files = (await readdir(directory)).filter(file => /^\d+_[\w-]+\.sql$/.test(file)).sort();
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(735001)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome TEXT PRIMARY KEY, checksum TEXT NOT NULL,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const applied = [];
    for (const file of files) {
      const sql = await readFile(new URL(file, directory), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE nome = $1', [file]);
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error('Uma migração aplicada foi alterada. Crie uma nova migração.');
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(nome, checksum) VALUES ($1, $2)', [file, checksum]);
      applied.push(file);
    }
    await client.query('COMMIT');
    return applied;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
