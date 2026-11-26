import { createApp } from './app.js';

const app = createApp();

const port = Number(process.env.PORT ?? 3333);
const host = process.env.HOST ?? '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
}

const server = app.listen(port, host);
server.once('listening', () => {
  console.log(`Help Desk disponível em http://${host}:${port}`);
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `A porta ${port} já está em uso. Encerre o serviço anterior ou altere PORT em env/.env.`
    : `Não foi possível iniciar o servidor (${error.code}). Confira HOST e PORT.`);
  process.exitCode = 1;
  void stop();
});

// Encerra conexões sem perder dados já confirmados no banco.
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  try {
    await new Promise(resolve => server.close(resolve));
    if (app.locals.sessionStore) await app.locals.sessionStore.close();
    if (app.locals.databasePool) await app.locals.databasePool.end();
    clearTimeout(timeout);
  } catch { process.exitCode = 1; }
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
