import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, appendFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { userInfo } from 'node:os';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = `${root}.local/postgres`;
const bin = `${base}/runtime/usr/lib/postgresql/18/bin`;
const data = `${base}/data`;
const socket = `${root}.local/pgsocket`;
const envFile = `${root}env/.env`;
const command = process.argv[2];
const run = (name, args, quiet = false) => {
  const result = spawnSync(`${bin}/${name}`, args, {
    stdio: quiet ? 'ignore' : 'inherit',
    env: { ...process.env, LD_LIBRARY_PATH: `${base}/runtime/usr/lib/x86_64-linux-gnu` },
  });
  if (result.error) throw new Error(`Não foi possível executar ${name}. Confira os binários em .local/postgres/runtime.`);
  return result.status;
};
const running = () => run('pg_ctl', ['-D', data, 'status'], true) === 0;
function start() {
  if (!existsSync(`${data}/PG_VERSION`)) throw new Error('Execute npm run db:local:setup primeiro.');
  if (running()) return console.log('PostgreSQL local já está ativo.');
  if (run('pg_ctl', ['-D', data, '-l', `${base}/postgres.log`, '-w', 'start'])) throw new Error('Falha ao iniciar PostgreSQL. Confira .local/postgres/postgres.log.');
}
try {
  if (command === 'setup') {
    if (existsSync(envFile) || existsSync(data)) throw new Error('Configuração ou dados já existem; setup não os sobrescreve. Use db:local:start.');
    mkdirSync(socket, { recursive: true, mode: 0o700 });
    chmodSync(`${root}.local`, 0o700);
    if (run('initdb', ['-D', data, '-L', `${base}/runtime/usr/share/postgresql/18`, '--encoding=UTF8', '--locale=C.UTF-8', '--auth-local=peer', '--auth-host=scram-sha-256'])) throw new Error('Falha na criação do cluster.');
    appendFileSync(`${data}/postgresql.conf`, `\nlisten_addresses = '127.0.0.1'\nport = 5433\nunix_socket_directories = '${socket.replaceAll("'", "''")}'\npassword_encryption = 'scram-sha-256'\n`);
    start();
    const admin = new pg.Client({ host: socket, port: 5433, user: userInfo().username, database: 'postgres' });
    const password = randomBytes(32).toString('hex');
    try {
      await admin.connect();
      // Password is generated hex, never user input or printed in command arguments.
      await admin.query(`CREATE ROLE helpdesk_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`);
      await admin.query('CREATE DATABASE helpdesk_local OWNER helpdesk_app');
      writeFileSync(envFile, `NODE_ENV=development\nHOST=127.0.0.1\nPORT=3333\nDATABASE_URL=postgresql://helpdesk_app:${password}@127.0.0.1:5433/helpdesk_local\nDATABASE_SSL=false\nDATABASE_CA_FILE=\nSESSION_SECRET=${randomBytes(48).toString('hex')}\nTRUST_PROXY=0\n`, { mode: 0o600, flag: 'wx' });
      console.log('Banco e env/.env criados. Execute db:migrate.');
    } finally { await admin.end(); }
  } else if (command === 'start') start();
  else if (command === 'stop') {
    if (running() && run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'])) throw new Error('Falha ao parar PostgreSQL.');
  } else if (command === 'status') {
    const active = running();
    console.log(active ? 'PostgreSQL local ativo em 127.0.0.1:5433.' : 'PostgreSQL local parado.');
    process.exitCode = active ? 0 : 1;
  } else throw new Error('Use setup, start, stop ou status.');
} catch (error) {
  console.error(error instanceof pg.DatabaseError ? 'Falha ao preparar o banco local; verifique o log PostgreSQL.' : error.message);
  process.exitCode = 1;
}
