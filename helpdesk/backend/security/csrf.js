import { timingSafeEqual } from 'node:crypto';
export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const supplied = req.get('x-csrf-token');
  const expected = req.session?.csrf;
  if (!supplied || !expected || !/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(403).json({ erro: 'Sessão do formulário expirada. Atualize a página.' });
  }
  next();
}
