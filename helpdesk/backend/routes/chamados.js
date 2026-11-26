import { Router } from 'express';
import { requireAuth, requireRole } from '../security/auth.js';
import { requireCsrf } from '../security/csrf.js';
import { validateTicket, validId, statuses } from '../validator/chamados.js';

export function ticketRoutes(pool) {
  const router = Router();
  router.use(requireAuth, requireCsrf);
  router.post('/', requireRole('solicitante'), async (req, res) => {
    let ticket;
    try { ticket = validateTicket(req.body); } catch (error) { return res.status(400).json({ erro: error.message }); }
    const { titulo, descricao, categoria, prioridade, local_problema } = ticket;
    const result = await pool.query(`INSERT INTO chamados(solicitante_id,titulo,descricao,categoria,prioridade,local_problema)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,status`, [req.user.id, titulo, descricao, categoria, prioridade, local_problema]);
    res.status(201).json({ chamado: result.rows[0] });
  });
  router.get('/', async (req, res) => {
    const { busca = '', status = '' } = req.query;
    if (typeof busca !== 'string' || busca.length > 150 || busca.includes('\0') || typeof status !== 'string' || (status && !statuses.includes(status))) {
      return res.status(400).json({ erro: 'Informe uma busca de até 150 caracteres e um status válido.' });
    }
    const term = busca.trim();
    const number = term.replace(/^#/, '');
    const id = validId(number) ? Number(number) : null;
    const scope = [req.user.perfil === 'atendente', req.user.id];
    const result = await pool.query(`SELECT c.id,c.titulo,c.categoria,c.prioridade,c.status,c.criado_em,u.nome AS solicitante_nome
      FROM chamados c JOIN usuarios u ON u.id=c.solicitante_id
      WHERE ($1::boolean OR c.solicitante_id=$2)
        AND ($3::text='' OR strpos(lower(c.titulo),lower($3))>0 OR c.id=$4)
        AND ($5::text='' OR c.status=$5)
      ORDER BY c.criado_em DESC,c.id DESC`, [...scope, term, id, status]);
    const summary = await pool.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status='aberto')::int AS aberto,
      count(*) FILTER (WHERE status='em_atendimento')::int AS em_atendimento,
      count(*) FILTER (WHERE status='resolvido')::int AS resolvido
      FROM chamados WHERE ($1::boolean OR solicitante_id=$2)`, scope);
    res.json({ chamados: result.rows, contadores: summary.rows[0] });
  });
  router.param('id', (req, res, next, id) => {
    if (!validId(id)) return res.status(400).json({ erro: 'Identificador de chamado inválido.' });
    next();
  });
  router.get('/:id', async (req, res) => {
    const result = await pool.query(`SELECT c.*,u.nome AS solicitante_nome FROM chamados c
      JOIN usuarios u ON u.id=c.solicitante_id WHERE c.id=$1 AND ($2::boolean OR c.solicitante_id=$3)`, [req.params.id, req.user.perfil === 'atendente', req.user.id]);
    if (!result.rows.length) return res.status(404).json({ erro: 'Chamado não encontrado.' });
    res.json({ chamado: result.rows[0] });
  });
  router.patch('/:id/status', requireRole('atendente'), async (req, res) => {
    if (!statuses.includes(req.body?.status)) return res.status(400).json({ erro: 'Selecione um status válido.' });
    const result = await pool.query(`UPDATE chamados SET status=$1 WHERE id=$2 RETURNING id,status,atualizado_em,resolvido_em`, [req.body.status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ erro: 'Chamado não encontrado.' });
    res.json({ chamado: result.rows[0] });
  });
  return router;
}
