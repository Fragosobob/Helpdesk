export const statuses = ['aberto', 'em_atendimento', 'resolvido'];
const categories = ['computador', 'internet', 'sistema', 'impressora', 'outros'];
const priorities = ['baixa', 'media', 'alta'];
function text(value, field, max, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || value.includes('\0')) throw new Error(`${field}: informe um texto válido.`);
  const trimmed = value.trim();
  if (trimmed.length > max || (!optional && !trimmed)) throw new Error(`${field}: preencha até ${max} caracteres.`);
  return trimmed || null;
}
export function validateTicket(body) {
  const titulo = text(body?.titulo, 'Título', 150);
  const descricao = text(body?.descricao, 'Descrição', 5000);
  const local_problema = text(body?.local_problema, 'Local', 100, true);
  if (!categories.includes(body?.categoria)) throw new Error('Selecione uma categoria válida.');
  if (!priorities.includes(body?.prioridade)) throw new Error('Selecione uma prioridade válida.');
  return { titulo, descricao, local_problema, categoria: body.categoria, prioridade: body.prioridade };
}
export function validId(value) {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647;
}
