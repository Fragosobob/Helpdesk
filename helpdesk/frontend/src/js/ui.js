window.HelpdeskUI = {
  async request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(20000), ...options });
    } catch {
      throw new Error(options.method && options.method !== 'GET'
        ? 'Não foi possível confirmar a operação. Confira os dados no painel antes de enviar novamente.'
        : 'Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.');
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('O servidor retornou uma resposta inesperada. Tente novamente em instantes.'); }
    if (response.status === 401 && !url.endsWith('/login')) location.replace('/index.html?expirada=1');
    if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.');
    return data;
  },
  busy(form, label) {
    if (form.dataset.busy === 'true') return null;
    form.dataset.busy = 'true';
    form.setAttribute('aria-busy', 'true');
    const buttons = [...form.querySelectorAll('button[type="submit"], button:not([type])')];
    const originals = buttons.map(button => [button, button.textContent, button.disabled]);
    for (const [button] of originals) { button.disabled = true; button.textContent = label; }
    return () => {
      form.dataset.busy = 'false'; form.removeAttribute('aria-busy');
      for (const [button, text, disabled] of originals) { button.textContent = text; button.disabled = disabled; }
    };
  },
  notice(element, text, success = false) {
    element.hidden = false;
    element.className = `aviso ${success ? 'aviso-sucesso' : 'aviso-erro'}`;
    element.textContent = text;
    element.focus();
  }
};
