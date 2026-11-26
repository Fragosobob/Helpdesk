(() => {
  const admin = document.body.dataset.perfil === 'atendente';
  const labels = { aberto: 'Aberto', em_atendimento: 'Em atendimento', resolvido: 'Resolvido', baixa: 'Baixa', media: 'Média', alta: 'Alta', computador: 'Computador', internet: 'Internet', sistema: 'Sistema', impressora: 'Impressora', outros: 'Outros' };
  const date = value => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' });
  const notice = document.querySelector('[data-ticket-message]');
  function show(text, success = false) {
    HelpdeskUI.notice(notice, text, success);
  }
  async function api(path, method = 'GET', body) {
    const headers = {};
    if (method !== 'GET') {
      const data = await HelpdeskUI.request('/api/auth/csrf');
      headers['X-CSRF-Token'] = data.token;
      headers['Content-Type'] = 'application/json';
    }
    return HelpdeskUI.request(`/api/chamados${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  function badge(type, value) {
    const span = document.createElement('span');
    span.className = `emblema emblema-${type}-${value}`;
    span.textContent = labels[value] || value;
    return span;
  }
  const table = document.querySelector('[data-ticket-list]');
  if (table) {
    const search = document.querySelector('[data-ticket-search]');
    const params = new URLSearchParams(location.search);
    search.elements.busca.value = params.get('busca') || '';
    search.elements.status.value = params.get('status') || '';
    search.addEventListener('submit', event => {
      if (!HelpdeskUI.busy(search, 'Buscando…')) event.preventDefault();
    });
    const results = document.querySelector('[data-results]');
    table.setAttribute('aria-busy', 'true');
    api(`?${params}`).then(({ chamados, contadores }) => {
      results.textContent = `${chamados.length} chamado(s) encontrado(s).`;
      table.replaceChildren();
      for (const ticket of chamados) {
        const row = document.createElement('tr');
        const values = [`#${ticket.id}`, ticket.titulo];
        if (admin) values.push(ticket.solicitante_nome);
        values.push(labels[ticket.categoria], badge('prioridade', ticket.prioridade), badge('status', ticket.status), date(ticket.criado_em));
        const link = document.createElement('a');
        link.href = `${admin ? 'chamado-admin' : 'chamado'}.html?id=${ticket.id}`;
        link.className = 'botao botao-pequeno botao-contorno-verde';
        link.textContent = 'Ver detalhes';
        values.push(link);
        for (const value of values) {
          const cell = document.createElement('td');
          if (value instanceof Node) cell.append(value); else cell.textContent = value;
          row.append(cell);
        }
        table.append(row);
      }
      if (!chamados.length) {
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = admin ? 8 : 7;
        cell.className = 'vazio';
        cell.textContent = params.get('busca') || params.get('status') ? 'Nenhum chamado corresponde à busca. Altere os filtros ou use Limpar busca e filtro.' : 'Nenhum chamado cadastrado.';
      }
      for (const status of ['total', 'aberto', 'em_atendimento', 'resolvido']) {
        const counter = document.querySelector(`.contador-${status} .contador-numero`);
        if (counter) counter.textContent = contadores[status];
      }
    }).catch(error => {
      table.replaceChildren(); results.textContent = 'Não foi possível carregar a lista.'; show(error.message);
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'botao botao-contorno-verde';
      retry.textContent = 'Tentar novamente'; retry.addEventListener('click', () => location.reload()); results.append(' ', retry);
    }).finally(() => table.removeAttribute('aria-busy'));
  }
  const form = document.querySelector('[data-new-ticket]');
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const done = HelpdeskUI.busy(form, 'Enviando…');
    if (!done) return;
    try {
      const { chamado } = await api('', 'POST', Object.fromEntries(new FormData(form)));
      location.assign(`/chamado.html?id=${chamado.id}&criado=1`);
    } catch (error) { show(error.message); done(); }
  });
  const details = document.querySelector('[data-ticket-details]');
  if (details) {
    const id = new URLSearchParams(location.search).get('id');
    const loading = document.querySelector('[data-detail-loading]');
    const statusForm = document.querySelector('[data-ticket-status]');
    function render(ticket) {
      details.hidden = false;
      document.querySelector('[data-ticket-title]').textContent = `#${ticket.id} — ${ticket.titulo}`;
      document.querySelector('[data-ticket-badge]').replaceChildren(badge('status', ticket.status));
      const values = { solicitante_nome: ticket.solicitante_nome, categoria: labels[ticket.categoria], prioridade: labels[ticket.prioridade], local_problema: ticket.local_problema || 'Não informado', criado_em: date(ticket.criado_em), atualizado_em: date(ticket.atualizado_em), descricao: ticket.descricao };
      for (const [key, value] of Object.entries(values)) document.querySelector(`[data-field="${key}"]`).textContent = value;
      if (statusForm) { statusForm.closest('[data-status-box]').hidden = false; statusForm.elements.novo_status.value = ticket.status; }
    }
    if (!/^[1-9]\d*$/.test(id || '') || Number(id) > 2147483647) { loading.hidden = true; show('Selecione um chamado válido pelo painel.'); return; }
    api(`/${id}`).then(({ chamado }) => {
      render(chamado);
      if (new URLSearchParams(location.search).get('criado') === '1') {
        show('Chamado aberto com sucesso.', true);
        history.replaceState(null, '', `${location.pathname}?id=${id}`);
      }
    }).catch(error => {
      show(error.message);
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'botao botao-contorno-verde';
      retry.textContent = 'Tentar novamente'; retry.addEventListener('click', () => location.reload()); notice.append(' ', retry);
    }).finally(() => { loading.hidden = true; });
    if (statusForm) statusForm.addEventListener('submit', async event => {
      event.preventDefault();
      const done = HelpdeskUI.busy(statusForm, 'Atualizando…');
      if (!done) return;
      let saved = false;
      try {
        await api(`/${id}/status`, 'PATCH', { status: statusForm.elements.novo_status.value });
        saved = true;
        const { chamado } = await api(`/${id}`);
        render(chamado);
        show('Status atualizado.', true);
      } catch (error) { show(saved ? 'Status salvo, mas não foi possível atualizar os detalhes. Recarregue a página.' : error.message); }
      finally { done(); }
    });
  }
})();
