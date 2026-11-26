export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  next();
}
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
    if (req.user.perfil !== role) return res.status(403).json({ erro: 'Acesso não permitido.' });
    next();
  };
}
