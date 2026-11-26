export function validateCredentials(body, register = false) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = body?.senha;
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
  if (email.includes('\0') || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (typeof senha !== 'string' || senha.length < (register ? 8 : 1) || senha.length > 128) throw new Error('A senha deve ter entre 8 e 128 caracteres.');
  if (register && (!nome || nome.includes('\0') || nome.length > 100)) throw new Error('Informe um nome de até 100 caracteres.');
  if (register && senha !== body.confirmar_senha) throw new Error('As senhas não coincidem.');
  return { email, senha, nome };
}
