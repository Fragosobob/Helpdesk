import pg from 'pg';
import { readFileSync } from 'node:fs';

export function databaseConfig(env = process.env) {
  if (!env.DATABASE_URL?.trim()) {
    throw new Error('Configure DATABASE_URL em env/.env antes de executar comandos do banco.');
  }
  let url;
  try { url = new URL(env.DATABASE_URL); } catch {
    throw new Error('DATABASE_URL deve ser uma URL PostgreSQL válida.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL deve usar postgres:// ou postgresql://.');
  }
  // A configuração TLS é centralizada aqui, sem parâmetros que a sobrescrevam.
  for (const key of url.searchParams.keys()) {
    if (key.startsWith('ssl')) {
      throw new Error('Remova parâmetros ssl da URL e configure DATABASE_SSL e DATABASE_CA_FILE.');
    }
  }
  const useSSL = env.DATABASE_SSL ?? 'true';
  if (!['true', 'false'].includes(useSSL)) {
    throw new Error('DATABASE_SSL deve ser true ou false.');
  }
  if (useSSL === 'false' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Conexões remotas exigem DATABASE_SSL=true.');
  }
  const ssl = useSSL === 'true' ? { rejectUnauthorized: true } : false;
  if (ssl && env.DATABASE_CA_FILE) ssl.ca = readFileSync(env.DATABASE_CA_FILE, 'utf8');
  return {
    connectionString: url.toString(), ssl, max: 5,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
    statement_timeout: 10000,
  };
}

export function createPool(env = process.env) {
  const pool = new pg.Pool(databaseConfig(env));
  pool.on('error', () => console.error('A conexão ociosa com o banco falhou.'));
  return pool;
}
