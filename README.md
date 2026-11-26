<p align="center">
  <img src="helpdesk/docs/assets/helpdesk-banner.svg" alt="Help Desk IFCE — Conectar pessoas. Organizar soluções." width="100%">
</p>

<p align="center"><strong>Central de chamados · IFCE Campus Boa Viagem</strong><br>Projeto acadêmico de atendimento e acompanhamento de solicitações.</p>

<p align="center">
  <a href="#equipe-de-desenvolvimento">Equipe</a> ·
  <a href="#o-que-o-help-desk-faz">Funcionalidades</a> ·
  <a href="#iniciar-nesta-máquina">Iniciar localmente</a> ·
  <a href="#configurar-em-outro-computador">Instalação</a> ·
  <a href="#estrutura-do-projeto">Estrutura</a>
</p>

## Sobre o projeto

O **Help Desk** reúne solicitações de suporte em um único lugar. O solicitante registra um problema e acompanha seu andamento; a equipe de atendimento consulta os chamados e atualiza o status até a resolução.

A identidade visual utiliza o verde institucional, superfícies claras e indicadores de status para facilitar a leitura. A aplicação possui interfaces separadas para solicitantes e atendentes, com permissões verificadas no servidor.

## Equipe de desenvolvimento

| Integrante | Responsabilidade |
| --- | --- |
| **Guilherme** | Front-end |
| **Matheus Alves** | Back-end |
| **Pedro** | Back-end |
| **Davi** | Manager e banco de dados |

## O que o Help Desk faz

- Cadastro de solicitantes, login e logout com sessão persistida no banco.
- Abertura de chamados com título, descrição, categoria e prioridade.
- Consulta dos próprios chamados pelo solicitante e de todos os chamados pelo atendente.
- Busca por número ou título, filtro por status e contadores de acompanhamento.
- Página de detalhes e alteração de status exclusiva para atendentes.
- Mensagens de carregamento, listas vazias e erros em português.

**Fluxo do atendimento:** aberto → em atendimento → resolvido. O atendente também pode reabrir um chamado.

Mensagens entre usuários, anexos, paginação e atualização em tempo real não estão implementados. A lista e os detalhes consultam as atualizações ao carregar a página.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | HTML, CSS e JavaScript |
| Servidor | Node.js **24.x**, Express 5 e módulos ES |
| Banco de dados | PostgreSQL e driver `pg` |
| Autenticação | `express-session`, sessões PostgreSQL e senhas com `scrypt` |
| Testes | Executor nativo do Node.js e PGlite para banco isolado |

## Iniciar nesta máquina

Se o banco local e o arquivo `helpdesk/env/.env` já estão configurados, abra o terminal **na pasta que contém este README** e execute:

```bash
cd helpdesk
npm ci
npm run local
```

O comando `npm run local` inicia o PostgreSQL local preparado em `.local/`, verifica a conexão, aplica as migrações pendentes e inicia o servidor.

Abra **http://localhost:3333**. Para encerrar o servidor, pressione **Ctrl+C**. O banco continua ativo; para encerrá-lo também, execute:

```bash
npm run db:local:stop
```

> O atalho `npm run local` depende dos binários e dados locais já preparados. Eles não vão para o GitHub. Se você acabou de baixar o projeto, siga a instalação abaixo.

## Configurar em outro computador

### 1. Instale os requisitos

Tenha **Node.js 24.x**, npm e um servidor **PostgreSQL** disponível. Crie no PostgreSQL um banco exclusivo para o Help Desk e um usuário com permissão para criar as tabelas nesse banco. Não há contas ou senhas padrão da aplicação.

### 2. Instale as dependências

Na pasta principal do repositório:

```bash
cd helpdesk
npm ci
```

Os comandos seguintes devem ser executados dentro de `helpdesk/`, onde fica o `package.json`.

### 3. Prepare as configurações

Crie a pasta `env` e copie `.env.example` para `env/.env`. No Linux/macOS:

```bash
mkdir -p env
cp .env.example env/.env
```

No Windows, você também pode criar a pasta e copiar o arquivo pelo editor. Edite `env/.env` com os dados do seu banco:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3333
DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@127.0.0.1:5432/helpdesk
DATABASE_SSL=false
DATABASE_CA_FILE=
SESSION_SECRET=SUBSTITUA_PELO_SEGREDO_GERADO
TRUST_PROXY=0
```

O endereço acima é apenas um modelo. Substitua usuário, senha, porta e nome do banco conforme sua instalação. Caracteres especiais nas credenciais precisam de codificação de URL.

Gere um segredo de sessão com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado para `SESSION_SECRET`. Não compartilhe esse valor. `DATABASE_SSL=false` serve apenas para o banco local; em hospedagem, use TLS com verificação de certificado e configure `DATABASE_CA_FILE` quando necessário. Evite parâmetros `ssl*` na URL, pois podem sobrescrever a configuração TLS.

### 4. Prepare as tabelas e inicie

```bash
npm run db:check
npm run db:migrate
npm start
```

Acesse **http://localhost:3333**. O primeiro comando testa a conexão; o segundo cria a estrutura necessária; o terceiro inicia o site. Migrações já aplicadas não são repetidas. `npm start` sozinho não executa migrações.

Para desenvolver com reinício automático do servidor, use `npm run dev` no lugar de `npm start`.

### 5. Faça o primeiro acesso

1. Abra o site e utilize o cadastro para criar um **solicitante**.
2. Entre com a conta e abra seu primeiro chamado.
3. Para criar um **atendente**, abra outro terminal dentro de `helpdesk/` e execute:

```bash
npm run admin:create
```

Informe nome, e-mail e senha quando solicitado. A senha não aparece no terminal. O comando cria uma conta nova; não promove nem substitui contas existentes. Depois, faça login no site com o atendente para acessar o painel de atendimento.

## Comandos úteis

Execute dentro de `helpdesk/`:

| Comando | Finalidade |
| --- | --- |
| `npm start` | Iniciar o servidor |
| `npm run dev` | Iniciar com reinício automático ao alterar código |
| `npm run local` | Iniciar banco local preparado, verificar, migrar e abrir servidor |
| `npm run db:check` | Verificar a conexão com PostgreSQL |
| `npm run db:migrate` | Aplicar migrações pendentes |
| `npm run db:local:status` | Consultar o banco da instalação local preparada |
| `npm run db:local:stop` | Parar esse banco local |
| `npm run admin:create` | Criar um atendente pelo terminal |
| `npm run check` | Conferir sintaxe do back-end |
| `npm test` | Executar testes automatizados |

O script `db:local:setup` é específico da preparação local em Linux com binários PostgreSQL 18 já colocados em `.local/postgres/runtime`. Ele não baixa nem instala o PostgreSQL e recusa sobrescrever configurações ou dados existentes. Para uma instalação nova, prefira o procedimento com PostgreSQL descrito acima.

## Estrutura do projeto

```text
.
├── README.md                      Apresentação e guia principal
├── .gitignore                     Proteção de arquivos locais
└── helpdesk/
    ├── .env.example               Modelo público, sem credenciais
    ├── package.json               Dependências e comandos
    ├── package-lock.json          Versões reproduzíveis das dependências
    ├── backend/
    │   ├── app.js                 Aplicação, sessões e páginas protegidas
    │   ├── server.js              Inicialização e encerramento do servidor
    │   ├── database/              Conexão, migrações e comandos do banco
    │   ├── routes/                API de autenticação e chamados
    │   ├── security/              Senhas, permissões e proteção CSRF
    │   └── validator/             Validação das entradas
    ├── frontend/
    │   ├── view/pages/            Telas de acesso, painéis e chamados
    │   ├── assets/                Estilos e imagens
    │   └── src/js/                Integração das telas com a API
    ├── scripts/                   Verificações e administração local
    ├── tests/                     Testes automatizados
    ├── docs/                      Documentação e identidade do README
    ├── env/                       Configuração privada — ignorada pelo Git
    └── .local/                    Banco e runtime locais — ignorados pelo Git
```

## O que fica fora do GitHub

Os arquivos `.gitignore` protegem a raiz do repositório e a aplicação:

| Arquivo ou pasta | Motivo |
| --- | --- |
| `env/`, `.env` e variantes | Credenciais do banco e segredo de sessão |
| `.local/` | Dados, sessões, logs e binários do banco local |
| `node_modules/` | Dependências reinstaladas por `npm ci` |
| `secrets/`, `credentials/`, `.aws/` e chaves privadas | Credenciais e material sensível |
| `backups/`, `dumps/` e arquivos de cópia de banco | Podem conter contas e informações reais |
| Logs e cobertura de testes | Saídas geradas localmente |
| `.codex/`, `.agents/` e configurações pessoais do editor | Arquivos locais de ferramentas |

O **`.env.example` pode ir para o GitHub**, pois contém somente o modelo vazio. `package-lock.json` e as migrações SQL também devem permanecer versionados.

O `.gitignore` não remove arquivos já versionados nem apaga o histórico. Se alguma credencial tiver sido publicada anteriormente, ela deve ser substituída. Não inclua dados reais ou senhas no código, imagens ou documentação.

## Segurança e validação

O servidor verifica o perfil e a autoria dos chamados. As senhas são armazenadas como hash com `scrypt`, as consultas usam parâmetros e as operações de escrita exigem proteção CSRF. As sessões ficam no PostgreSQL; o logout invalida a sessão. O cadastro público cria somente solicitantes.

```bash
npm run check
npm test
```

Os testes usam banco isolado e verificam autenticação, permissões, chamados, filtros, migrações e recuperação de sessões. Não substituem a validação de conexão, HTTPS e permissões no ambiente de hospedagem. Em produção, configure `NODE_ENV=production`, HTTPS e `TRUST_PROXY=1` somente se houver exatamente um proxy confiável. O limite de tentativas de autenticação fica em memória e precisa de armazenamento compartilhado para múltiplas instâncias.

## Problemas comuns

| Situação | Como resolver |
| --- | --- |
| `npm` não encontra `package.json` | Entre na pasta `helpdesk/` antes de executar os comandos |
| Porta ocupada (`EADDRINUSE`) | Encerre o servidor anterior ou altere `PORT` em `env/.env` |
| Autenticação indisponível | Configure `DATABASE_URL`, segredo de sessão e migrações |
| Falha na conexão com o banco | Confira se PostgreSQL está ativo e revise endereço, porta e credenciais |
| Erro de `SESSION_SECRET` | Gere um segredo aleatório com pelo menos 32 caracteres |
| `npm run local` não encontra binários ou dados | Use a instalação com PostgreSQL descrita neste README |
| Página aberta sem funcionamento pelo explorador | Acesse pelo servidor em `http://localhost:3333`, não pelo arquivo HTML |

O documento `helpdesk/docs/LEIAME.txt` é um registro histórico do protótipo. Para executar a implementação atual em Node.js, siga este README.
