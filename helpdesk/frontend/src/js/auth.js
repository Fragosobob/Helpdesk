const form = document.querySelector('[data-auth]');
const message = document.querySelector('[data-auth-message]');
async function request(path, options = {}) {
  return HelpdeskUI.request(`/api/auth/${path}`, options);
}
async function submit(path, body) {
  const { token } = await request('csrf');
  return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(body) });
}
function show(text, success = false) {
  HelpdeskUI.notice(message, text, success);
}
if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const done = HelpdeskUI.busy(form, 'Aguarde…');
    if (!done) return;
    try {
      const data = Object.fromEntries(new FormData(form));
      if (form.dataset.auth === 'register' && data.senha !== data.confirmar_senha) throw new Error('As senhas não coincidem.');
      const result = await submit(form.dataset.auth, data);
      if (result.destino) location.assign(result.destino);
      else { form.reset(); show(result.mensagem, true); }
    } catch (error) { show(error.message); }
    finally { done(); }
  });
}
if (document.querySelector('[data-logout]')) {
  request('me').then(({ usuario }) => {
    document.querySelectorAll('.topo-usuario').forEach(node => { node.textContent = `${usuario.nome} (${usuario.perfil === 'atendente' ? 'Atendente' : 'Solicitante'})`; });
    const greeting = document.querySelector('[data-greeting]');
    if (greeting) greeting.textContent = `Olá, ${usuario.nome}!`;
  }).catch(error => show(error.message));
  document.querySelector('[data-logout]').addEventListener('click', async event => {
    event.preventDefault();
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Saindo…';
    try { await submit('logout', {}); location.replace('/index.html'); }
    catch (error) { show(error.message); button.disabled = false; button.textContent = 'Sair'; }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
}

if (form && new URLSearchParams(location.search).get('expirada') === '1') show('Sua sessão expirou. Entre novamente.');
