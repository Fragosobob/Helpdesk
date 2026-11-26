import { createPool, databaseConfig } from './connection.js';
import { migrate } from './migrate.js';

let pool;
try {
  // Erros de configuração são seguros; mensagens de erros do driver não são exibidas.
  databaseConfig();
} catch (error) {
  console.error(error.message.startsWith('ENOENT') ? 'Certificado CA não encontrado.' : error.message);
  process.exit(1);
}

try {
  pool = createPool();
  const command = process.argv[2];
  if (command === 'check') {
    await pool.query('SELECT 1 AS conectado');
    console.log('Conexão PostgreSQL validada.');
  } else if (command === 'migrate') {
    const client = await pool.connect();
    try {
      const applied = await migrate(client);
      console.log(applied.length ? `Migrações aplicadas: ${applied.join(', ')}` : 'Banco já atualizado.');
    } finally { client.release(); }
  } else {
    throw new Error('Comando desconhecido.');
  }
} catch {
  console.error('Operação do banco falhou. Confira conexão, TLS, permissões e integridade das migrações. Credenciais não foram exibidas.');
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
