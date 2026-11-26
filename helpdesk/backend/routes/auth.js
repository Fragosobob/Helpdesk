import { Router } from 'express';
import { requireCsrf } from '../security/csrf.js';
import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { hashPassword, verifyPassword } from '../security/password.js';
import { validateCredentials } from '../validator/auth.js';
import { requireAuth } from '../security/auth.js';
const invoke = (session, method) => new Promise((resolve, reject) => session[method](error => error ? reject(error) : resolve()));
export function authRoutes(pool, production) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { erro: 'Muitas tentativas. Aguarde 15 minutos.' } });
  router.get('/csrf', (req, res) => {
    req.session.csrf ??= randomBytes(32).toString('hex');
    res.json({ token: req.session.csrf });
  });
  router.use(requireCsrf);
  router.post('/register', limiter, async (req, res) => {
    let data;
    try { data = validateCredentials(req.body, true); } catch (error) { return res.status(400).json({ erro: error.message }); }
    try {
      await pool.query(`INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ($1,$2,$3,'solicitante')`, [data.nome, data.email, await hashPassword(data.senha)]);
      res.status(201).json({ mensagem: 'Conta criada. Entre com seu e-mail e senha.' });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ erro: 'Não foi possível cadastrar este e-mail.' });
      throw error;
    }
  });
  router.post('/login', limiter, async (req, res) => {
    let data;
    try { data = validateCredentials(req.body); } catch { return res.status(400).json({ erro: 'Informe e-mail e senha válidos.' }); }
    const result = await pool.query('SELECT id,nome,email,perfil,senha_hash FROM usuarios WHERE email=$1', [data.email]);
    const user = result.rows[0];
    // Mesmo custo de derivação quando o e-mail não existe.
    const hash = user?.senha_hash ?? `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;
    if (!await verifyPassword(data.senha, hash) || !user) return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    await invoke(req.session, 'regenerate');
    req.session.userId = user.id;
    req.session.csrf = randomBytes(32).toString('hex');
    await invoke(req.session, 'save');
    res.json({ destino: user.perfil === 'atendente' ? '/painel-admin.html' : '/painel.html' });
  });
  router.get('/me', requireAuth, (req, res) => res.json({ usuario: req.user }));
  router.post('/logout', requireAuth, async (req, res) => {
    await invoke(req.session, 'destroy');
    res.clearCookie('helpdesk.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: production });
    res.json({ mensagem: 'Sessão encerrada.' });
  });
  return router;
}
