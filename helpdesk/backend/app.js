import express from 'express';
import { ticketRoutes } from './routes/chamados.js';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { fileURLToPath } from 'node:url';
import { createPool } from './database/connection.js';
import { authRoutes } from './routes/auth.js';
const pagesPath = fileURLToPath(new URL('../frontend/view/pages/', import.meta.url));
const assetsPath = fileURLToPath(new URL('../frontend/assets/', import.meta.url));
const scriptsPath = fileURLToPath(new URL('../frontend/src/js/', import.meta.url));

export function createApp({ pool, store, env = process.env } = {}) {
  const app = express();
  const production = env.NODE_ENV === 'production';
  app.disable('x-powered-by');
  if (env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    next();
  });
  app.use('/assets', express.static(assetsPath));
  app.use('/js', express.static(scriptsPath));
  app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '64kb' }));
  app.get(['/', '/index.html', '/cadastro.html'], (req, res) => res.sendFile(req.path === '/cadastro.html' ? 'cadastro.html' : 'index.html', { root: pagesPath }));

  if (pool || env.DATABASE_URL) {
    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('Configure SESSION_SECRET com pelo menos 32 caracteres aleatórios.');
    pool ??= createPool(env);
    const PgStore = connectPgSimple(session);
    store ??= new PgStore({ pool, tableName: 'sessoes', createTableIfMissing: false, pruneSessionInterval: 900, errorLog: () => console.error('Falha no armazenamento de sessões.') });
    app.locals.sessionStore = store;
    app.locals.databasePool = pool;
    app.use(session({ name: 'helpdesk.sid', secret: env.SESSION_SECRET, store, resave: false, saveUninitialized: false,
      cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 } }));
    app.use(async (req, res, next) => {
      if (req.session.userId) {
        const result = await pool.query('SELECT id,nome,email,perfil FROM usuarios WHERE id=$1', [req.session.userId]);
        req.user = result.rows[0];
      }
      next();
    });
    app.use('/api/auth', authRoutes(pool, production));
    app.use('/api/chamados', ticketRoutes(pool));
  } else {
    app.use('/api', (req, res) => res.status(503).json({ erro: 'Autenticação indisponível. O banco de dados ainda não foi configurado.' }));
  }
  const protectedPages = {
    '/painel.html': 'solicitante', '/novo-chamado.html': 'solicitante', '/chamado.html': 'solicitante',
    '/painel-admin.html': 'atendente', '/chamado-admin.html': 'atendente',
  };
  for (const [path, role] of Object.entries(protectedPages)) {
    app.get(path, (req, res) => {
      if (!req.user) return res.redirect('/index.html');
      if (req.user.perfil !== role) return res.status(403).send('Acesso não permitido para este perfil.');
      res.sendFile(path.slice(1), { root: pagesPath });
    });
  }
  app.use((req, res) => res.status(404).json({ erro: 'Recurso não encontrado.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error('Falha ao atender requisição:', error.code ?? error.name);
    const status = error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : ['charset.unsupported', 'encoding.unsupported'].includes(error.type) ? 415 : error.status === 404 ? 404 : 500;
    res.status(status).json({ erro: status === 500 ? 'Não foi possível atender à solicitação. Tente novamente.' : 'Requisição inválida ou muito grande.' });
  });
  return app;
}
