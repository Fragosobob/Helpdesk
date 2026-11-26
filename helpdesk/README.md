# Help Desk IFCE

Projeto acadêmico de atendimento de chamados do Campus Boa Viagem.

## Operação Sobrevivência Total — Etapas 1 a 6

Base Node.js/Express com cadastro, login, sessão persistente PostgreSQL, logout
real e páginas protegidas por perfil. A estrutura do banco e a autenticação
foram testadas em PostgreSQL embarcado isolado. Ainda é necessário criar o banco
definitivo, configurar a conexão e executar as migrações para utilizar contas.

Abertura, listagem, detalhes por ID e alteração de status dos chamados estão
integrados à API. Busca por número/título e filtro por status estão ativos.
Os contadores mostram todos os chamados autorizados, independentemente dos
filtros aplicados à lista. Mensagens ainda não estão disponíveis.
Sem configuração do banco, as telas de entrada abrem, mas a API informa que a
autenticação está indisponível; as páginas internas redirecionam para o login.

## Executar localmente

Requisitos: Node.js 24.x e npm.

Na raiz do projeto, instale as dependências:

```bash
npm ci
```

Inicie o servidor:

```bash
npm start
```

Abra **http://localhost:3333** no navegador. Para reiniciar automaticamente
o servidor quando o código mudar, use `npm run dev`. Encerre com `Ctrl+C`.
Use `npm run check` para conferir a sintaxe dos arquivos do backend.

Não abra os HTMLs diretamente pelo explorador de arquivos: os caminhos dos
assets são resolvidos pelo servidor.

## Configuração

O servidor funciona sem arquivo de ambiente, usando `127.0.0.1:3333`.
Para personalizar, copie `env/.env.example` para `env/.env` e ajuste os valores.
O npm carrega esse arquivo opcionalmente; variáveis já definidas no ambiente
têm precedência. Nunca publique o arquivo com valores reais.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3333` | Porta HTTP |
| `HOST` | `127.0.0.1` | Interface de rede; hospedagem poderá exigir `0.0.0.0` |
| `NODE_ENV` | Exemplo: `development` | Ambiente de execução |
| `DATABASE_URL` | Sem padrão | URL do PostgreSQL, necessária nos comandos do banco |
| `DATABASE_SSL` | `true` | TLS com verificação de certificado; `false` apenas para localhost |
| `DATABASE_CA_FILE` | Opcional | Caminho do certificado CA do provedor |

O aviso `env/.env not found. Continuing without it.` significa apenas que o
arquivo opcional ainda não foi criado. `EADDRINUSE` significa porta ocupada:
encerre o servidor anterior, se for seu, ou use `PORT=3002 npm start`.
O servidor só anuncia disponibilidade depois de conseguir abrir a porta.

## Banco de dados — Etapa 2

Nenhum banco hospedado foi criado. Para conectar um PostgreSQL quando estiver
disponível, copie `env/.env.example` para `env/.env` e preencha `DATABASE_URL`
no seu editor. Não envie credenciais em mensagens nem as coloque no Git.
Formato ilustrativo: `postgresql://USUARIO:SENHA@HOST:5432/BANCO`.
Caracteres especiais em usuário/senha precisam de codificação de URL.

Em hospedagem, mantenha `DATABASE_SSL=true`. Se o provedor fornecer uma CA,
configure `DATABASE_CA_FILE`. Remova parâmetros `ssl*` da URL para que não
sobrescrevam essa configuração; não desative a verificação do certificado.

Com a conexão configurada, execute:

```bash
npm run db:check
npm run db:migrate
```

O primeiro comando verifica a conexão sem alterar o esquema. O segundo cria
as tabelas em uma transação. Use um banco exclusivo deste projeto. Migrações
já aplicadas não são repetidas; seus hashes são conferidos. Novas mudanças
devem entrar em um novo arquivo SQL, sem editar migrações já aplicadas.
As migrações não são executadas automaticamente ao iniciar o servidor.

Tabelas: `usuarios`, `chamados`, `sessoes` e `schema_migrations`. Há restrições
de perfil, categoria, prioridade, status, tamanhos, e-mail normalizado/único e
relacionamento do chamado com seu solicitante. Datas de atualização e resolução
são controladas por trigger. `senha_hash` deve receber hash da futura camada de
autenticação: o banco não transforma uma senha em hash nem verifica o algoritmo.
A autorização por perfil é aplicada no servidor. A API restringe leitura ao proprietário ou atendente; somente atendentes alteram status.

`sessoes` prepara o formato de armazenamento PostgreSQL para express-session.
O middleware mantém sessões por até oito horas e limpa sessões expiradas a
cada quinze minutos enquanto a aplicação está ativa. Não há usuários nem senhas padrão.

## Testes

```bash
npm run check
npm test
```

Os testes do esquema usam PGlite (PostgreSQL embarcado) em memória, como
dependência de desenvolvimento. Verificam migração repetível, integridade,
restrições e datas, sem acessar banco real. Isso não substitui `db:check` e a
migração no PostgreSQL hospedado, necessários para validar rede, TLS e permissões.
Também há teste de regressão para o conflito de porta do servidor.

## Estrutura

```text
backend/
  app.js             Aplicação Express e arquivos públicos
  server.js          Inicialização do servidor
  database/          Conexão, comandos e migrações PostgreSQL
  model/             Reservado para acesso aos dados
  routes/            Reservado para rotas da API
  security/          Reservado para autenticação e permissões
  validator/         Reservado para validações
frontend/
  view/pages/        Sete páginas HTML
  assets/css/        Estilos existentes
  assets/img/        Imagem existente
  src/               Reservado para integração do frontend
env/
  .env.example       Exemplo sem credenciais
docs/
  LEIAME.txt         Orientações históricas do protótipo HTML/CSS
```

O servidor publica apenas `frontend/view/pages/` na raiz da URL e
`frontend/assets/` em `/assets`. Backend, configurações e documentação não
são disponibilizados como arquivos estáticos.

O LEIAME original descreve uma proposta anterior com PHP. A implementação
atual da base usa Express; renomear HTML para PHP não implementa operações.
Pastas reservadas ainda vazias podem não aparecer em um checkout Git.

## Próximas etapas

Configurar banco e segredos; publicação e validação no ambiente definitivo;
documentação final e apresentação. Nenhum serviço externo foi publicado.

## Autenticação — Etapa 3

1. Configure `DATABASE_URL` e TLS em `env/.env`.
2. Gere um segredo com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   e salve em `SESSION_SECRET` no mesmo arquivo (mínimo de 32 caracteres).
3. Execute `npm run db:check` e `npm run db:migrate`.
4. Execute `npm start`, abra o site e cadastre um solicitante.
5. Para criar um atendente, execute `npm run admin:create` em um terminal.
   O comando solicita nome, e-mail e senha sem exibi-la. Não altera contas
   existentes nem promove solicitantes. Acesso ao terminal e ao banco é privilegiado.

O cadastro público ignora qualquer perfil enviado e sempre cria solicitantes.
Senhas têm de 8 a 128 caracteres e são armazenadas com scrypt, salt aleatório e
custo N=131072, r=8, p=1. A confirmação é validada e nunca armazenada.
O login regenera a sessão, busca o perfil no banco e direciona ao painel correto.
Logout destrói a sessão no banco e remove o cookie. Não se usa localStorage
para credenciais ou tokens de autenticação.

| Rota | Comportamento |
| --- | --- |
| `GET /api/auth/csrf` | Token de formulário associado à sessão |
| `POST /api/auth/register` | Cadastro de solicitante |
| `POST /api/auth/login` | Autenticação e nova sessão |
| `GET /api/auth/me` | Usuário autenticado, sem hash de senha |
| `POST /api/auth/logout` | Invalidação da sessão |

POSTs exigem JSON e o cabeçalho `X-CSRF-Token`, obtido antes pelo frontend.
Há limite compartilhado de 20 tentativas de login/cadastro por IP em 15 minutos,
armazenado em memória: reiniciar o processo zera o limite. Antes de escalar para
múltiplas instâncias, será necessário um armazenamento compartilhado do limite.
O cookie é HttpOnly e SameSite=Lax; em `NODE_ENV=production` também exige HTTPS.
`TRUST_PROXY=1` deve ser ativado somente atrás de exatamente um proxy confiável.
O deploy precisa validar essa configuração para cookies e identificação de IP.

As páginas administrativas exigem perfil atendente no servidor. As páginas de
solicitante exigem perfil solicitante. O nome exibido vem da sessão e é inserido
como texto, sem interpretar HTML. O visual original foi preservado.

Os testes verificam hash, perfil obrigatório no cadastro, e-mail duplicado,
confirmação, credenciais inválidas, CSRF, rotação e destruição de sessão,
armazenamento PostgreSQL e bloqueio de páginas por perfil. Testes isolados não
substituem a validação TLS, HTTPS e navegador no ambiente publicado.

## Chamados — Etapa 4

| Rota | Permissão e comportamento |
| --- | --- |
| `POST /api/chamados` | Solicitante abre chamado; autoria vem da sessão e status inicial é aberto |
| `GET /api/chamados` | Solicitante vê somente os próprios; atendente vê todos |
| `GET /api/chamados/:id` | Proprietário ou atendente; retorna 404 para chamado alheio ou inexistente |
| `PATCH /api/chamados/:id/status` | Somente atendente; aceita aberto, em_atendimento ou resolvido |

Criação e atualização exigem sessão e token CSRF. Campos são validados no
servidor, consultas usam parâmetros e valores enviados de autoria/status na
criação são ignorados. IDs inválidos retornam 400. Não há exclusão ou edição de
conteúdo nesta etapa. O atendente pode selecionar qualquer um dos três status,
inclusive voltar a aberto; o banco atualiza as datas de resolução/reabertura.

As telas buscam os dados da API e usam `?id=...` para os detalhes. Textos do
usuário são inseridos com `textContent`, sem interpretar HTML. A listagem atual
retorna os chamados autorizados correspondentes à busca e ao status, sem
paginação; esse limite deve ser revisto antes de ampliar o volume de uso. A atualização é
visualizada ao recarregar/abrir os detalhes, sem atualização em tempo real.

O teste HTTP isolado cobre dois solicitantes e um atendente, criação válida e
inválida, tentativa de forjar autoria, bloqueio de leitura alheia, permissão de
status, CSRF, datas e consulta por uma nova sessão. Não configura banco real nem
SESSION_SECRET de produção. A validação no ambiente publicado ainda precisa
ser realizada.

## Experiência essencial — Etapa 5

- `GET /api/chamados?busca=texto&status=aberto`: busca um trecho literal do
  título (sem distinguir maiúsculas/minúsculas) ou o número exato, com ou sem `#`.
  Busca e status são combinados. Acentos continuam significativos.
- `contadores` retorna total, abertos, em atendimento e resolvidos de todos os
  chamados autorizados, mesmo com filtro ativo. Não inclui chamados alheios.
- Os campos de busca ficam na URL e são restaurados ao recarregar. O link
  Limpar busca e filtro retorna à listagem completa autorizada.
- Listas vazias distinguem ausência de chamados e ausência de resultados.
  Erros de carregamento oferecem tentativa manual, sem reenviar gravações.
- Formulários indicam processamento, bloqueiam submissões simultâneas e
  preservam os campos quando há falha. Esse bloqueio é do navegador, não uma
  garantia de idempotência entre abas ou requisições diretas à API.
- Falhas de rede e tempo limite têm mensagens em português; uma gravação sem
  resposta é tratada como não confirmada, para evitar reenvio automático.
- Sessões expiradas direcionam ao login; avisos recebem foco. Descrições
  preservam quebras de linha, nomes longos se ajustam e tabelas rolam em sua
  própria região, acessível pelo teclado.

Validação: suíte HTTP com busca, combinação de filtros, contadores, entradas
inválidas e isolamento. Teste adicional no Chrome com PostgreSQL em memória
percorreu cadastro, login, lista vazia, criação, busca/limpeza, alteração de
status, falha de conexão e recuperação e logout. O painel foi conferido nas
larguras 320, 390, 768 e 1366 pixels. Isso não substitui testar o deploy, outros
navegadores e aparelhos físicos. Nenhum banco real ou segredo foi configurado.

## Validação final — Etapa 6

Relatório: [validação da Etapa 6](docs/validacao-etapa-6.md).
A suíte contém nove testes, incluindo recuperação de dados/sessões após
reinício e revogação do cookie após logout. A aplicação também foi conferida
no Chrome com dados isolados. Banco real, segredo e deploy continuam pendentes.

A importação de `backend/app.js` expõe somente `createApp`; a aplicação é
inicializada por `backend/server.js`. Encerrar com Ctrl+C ou SIGTERM fecha o
servidor e as conexões. Respostas usam CSP restrita à própria origem; futuros
recursos externos precisarão de análise antes de mudar essa política.
