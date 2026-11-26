# Operação Sobrevivência Total — validação da Etapa 6

Data: 26/11/2026. Escopo: MVP local, sem criação de banco hospedado,
configuração de segredos reais ou publicação.

## Correções

- Nome/e-mail contendo caractere nulo são rejeitados pela validação, evitando
  erro interno do PostgreSQL causado por essa entrada.
- Importar a fábrica da aplicação não inicializa automaticamente outra instância
  e outro pool. Somente o servidor cria a aplicação usada em execução.
- JSON inválido, corpo acima do limite e charset não suportado retornam
  respectivamente 400, 413 e 415, sem stack ou credenciais na resposta.
- Cabeçalhos de segurança restringem scripts/recursos à própria origem,
  enquadramento da página, interpretação de MIME e envio de referência.
- SIGINT/SIGTERM e falha na abertura da porta encerram o servidor e os recursos
  de sessão/banco. O encerramento tem limite de dez segundos.

## Evidência

- `npm run check`: sintaxe aprovada.
- `npm test`: nove testes aprovados, com autenticação, perfis, CSRF, logout,
  filtros, contadores, isolamento de chamados, migrações e integridade.
- Teste de recuperação fecha e reabre PGlite persistido em diretório temporário,
  recria a aplicação e confirma chamado e sessão existentes. Após logout,
  reutilizar o cookie antigo continua retornando 401, inclusive após reinício.
- Verificação de cookies de produção inclui HttpOnly, Secure e SameSite=Lax
  com simulação de proxy HTTPS. Não é uma conexão TLS pública real.
- Sem banco configurado: API retorna 503 e páginas privadas redirecionam para
  login. Arquivos internos não são servidos.
- `npm audit --omit=dev`: nenhuma vulnerabilidade reportada nesta execução.
- Chrome headless com banco isolado: cadastro, login, abertura, busca, logout,
  bloqueio de acesso após logout e duas submissões simultâneas gerando somente
  uma criação. Conteúdo HTML no título aparece como texto, sem criar elemento.
- Painel conferido em 320, 390, 768 e 1366 pixels, sem overflow horizontal da
  página. Nenhum erro JavaScript ou violação de CSP observado nesse fluxo.

Os testes de requisições inválidas geram logs de erro esperados no console;
eles não representam falha da suíte. As ferramentas de navegador ficaram em
/tmp, sem dependência adicional no projeto. O banco de recuperação é removido
no encerramento dos testes.

## Limites e pendências da publicação

Aprovado para seguir à configuração e publicação, não declarado operacional
em produção. Ainda falta:

1. Criar/configurar o PostgreSQL real, TLS e credenciais.
2. Gerar SESSION_SECRET, definir NODE_ENV, HOST, PORT e proxy confiável.
3. Aplicar migrações e criar o atendente no ambiente definitivo.
4. Publicar e validar HTTPS/cookies, cadastro, chamados e logout pela URL real.
5. Verificar cotas, partida após inatividade, backup e ensaio de apresentação.

PGlite valida SQL e persistência isolada; não testa rede, certificados ou
permissões do PostgreSQL hospedado. Teste visual em Chrome não cobre todos os
navegadores ou aparelhos físicos. Não foi feito teste de carga/pentest. O limite
de login é por processo e a listagem não tem paginação; adequados ao escopo
pequeno, precisam ser revistos antes de ampliar o uso. Mensagens entre usuários
continuam opcionais e não implementadas.
