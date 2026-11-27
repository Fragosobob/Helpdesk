# Planejamento da apresentação — Help Desk IFCE

## Objetivo

Apresentar o projeto de forma didática, com explicações acessíveis para integrantes e público iniciantes na área. A apresentação acompanha a história de um problema, desde o registro até a resolução, para mostrar como as partes do sistema se conectam.

Este planejamento considera o README e a implementação de autenticação, chamados, interface e banco de dados. A distribuição segue os cargos registrados no README; a divisão entre os dois integrantes de back-end é uma sugestão para evitar repetição.

**Duração sugerida:** 20 minutos de apresentação e 5 minutos para perguntas.

**Exemplo usado por todos:** “Um aluno encontra um computador sem internet no laboratório e precisa solicitar suporte.”

## 1. Divisão da apresentação

| Integrante | Cargo no README | Parte da apresentação | Tempo |
| --- | --- | --- | --- |
| Davi | Manager e banco de dados | Apresentação do problema, organização geral, armazenamento e conclusão | 5 min |
| Guilherme | Front-end | Telas, experiência do usuário e abertura de um chamado | 5 min |
| Matheus Alves | Back-end | Cadastro, login e permissões | 4 min |
| Pedro | Back-end | Processamento dos chamados e atualização do atendimento | 4 min |
| Equipe | Demonstração integrada | Concluir o fluxo apresentado | 2 min |

## 2. Roteiro dos slides e das falas

### Slide 1 — O que é o Help Desk?

**Responsável:** Davi. **Tempo:** 1 minuto.

Colocar no slide:

- Nome do projeto e equipe.
- Central de chamados do IFCE Campus Boa Viagem.
- Objetivo: registrar problemas e acompanhar o atendimento.

**Fala sugerida:**

> “O Help Desk é um sistema para organizar pedidos de suporte. Uma pessoa registra o problema, e a equipe de atendimento acompanha essa solicitação até sua resolução. Vamos mostrar isso usando um computador sem internet como exemplo.”

### Slide 2 — Como as partes trabalham juntas?

**Responsável:** Davi. **Tempo:** 1 minuto.

Mostrar uma sequência simples:

**Pessoa → Tela → Servidor → Banco de dados**

Explicar cada parte:

- **Front-end:** telas com as quais a pessoa interage.
- **Back-end:** verifica os dados e executa as regras.
- **Banco de dados:** armazena as informações.

**Fala sugerida:**

> “Podemos comparar o sistema a uma recepção. A tela recebe o pedido, o servidor verifica o que pode ser feito, e o banco guarda o registro. Essas partes trabalham juntas para que o chamado possa ser consultado depois.”

Na parte de gestão, Davi pode explicar como os assuntos foram divididos entre as áreas. Relatos sobre organização, dificuldades e decisões da equipe devem corresponder ao que realmente aconteceu.

### Slide 3 — O que o usuário encontra nas telas?

**Responsável:** Guilherme. **Tempo:** 2 minutos.

Mostrar imagens das telas reais:

- Login e cadastro.
- Painel do solicitante.
- Formulário de novo chamado.
- Detalhes do chamado.

Explicar as tecnologias com exemplos visuais:

| Tecnologia | Explicação simples |
| --- | --- |
| HTML | Organiza títulos, campos e botões |
| CSS | Define cores, tamanhos e disposição dos elementos |
| JavaScript | Envia os dados e apresenta as respostas do servidor |

**Fala sugerida:**

> “O front-end é a parte que o usuário vê e utiliza. O HTML organiza os elementos, o CSS define a aparência e o JavaScript faz a tela interagir com o servidor. Também mostramos mensagens para informar quando algo está carregando ou quando ocorre um erro.”

**Ponto didático:** apontar um campo, um botão e uma mensagem na própria tela enquanto explica.

### Slide 4 — Registrando o problema

**Responsável:** Guilherme. **Tempo:** 3 minutos.

Demonstrar o preenchimento:

| Campo | Exemplo |
| --- | --- |
| Título | Computador sem acesso à internet |
| Descrição | O computador liga, mas não consegue acessar os sites |
| Categoria | Internet |
| Prioridade | Média |
| Local | Laboratório de informática |

**Fala sugerida:**

> “Esses campos ajudam a descrever o problema para quem vai atender. Ao enviar, a tela encaminha as informações ao servidor. Depois que o registro é criado, o sistema apresenta os detalhes e o número do chamado.”

Mostrar também:

- Busca por título ou número.
- Filtro por status.
- Contadores do painel.

**Transição para Matheus:**

> “Agora que vimos as telas, o Matheus vai explicar como o sistema reconhece quem está usando e controla o acesso.”

### Slide 5 — Como funciona o cadastro e o login?

**Responsável:** Matheus Alves. **Tempo:** 2 minutos.

Colocar no slide:

**Cadastro → Verificação dos dados → Conta criada → Login → Sessão**

Explicar:

- O cadastro público cria uma conta de solicitante.
- O servidor verifica e-mail e senha no login.
- A sessão permite reconhecer o usuário nas próximas solicitações.
- O logout encerra essa sessão.

**Fala sugerida:**

> “O servidor verifica os dados recebidos e confere as credenciais no login. Quando o acesso é autorizado, ele cria uma sessão, que permite reconhecer o usuário enquanto navega. Ao sair, essa sessão é invalidada.”

Sobre senhas:

> “O banco guarda uma representação protegida da senha, chamada hash, em vez da senha em texto.”

Não é necessário explicar o algoritmo matemático.

### Slide 6 — Quem pode fazer o quê?

**Responsável:** Matheus Alves. **Tempo:** 2 minutos.

| Ação | Solicitante | Atendente |
| --- | --- | --- |
| Abrir chamado | Sim | Não, no fluxo atual |
| Consultar chamados | Apenas os próprios | Todos |
| Alterar status | Não | Sim |

**Fala sugerida:**

> “Existem dois perfis. O solicitante acompanha os próprios chamados, enquanto o atendente consulta todos e atualiza o atendimento. Essas permissões são verificadas pelo servidor, inclusive quando alguém tenta acessar diretamente um endereço.”

**Transição para Pedro:**

> “Depois de reconhecer o usuário e verificar suas permissões, o servidor pode processar o chamado. O Pedro vai explicar essa etapa.”

### Slide 7 — O que acontece quando clicamos em enviar?

**Responsável:** Pedro. **Tempo:** 2 minutos.

Mostrar quatro passos:

1. A tela envia os dados.
2. O servidor verifica os campos e a permissão.
3. O chamado é registrado no banco.
4. O servidor responde com o número e o status inicial.

**Fala sugerida:**

> “O botão inicia uma sequência. O servidor recebe as informações, verifica se estão válidas e solicita o armazenamento. Quando tudo dá certo, devolve uma resposta para a tela mostrar o chamado criado.”

Introduzir apenas um termo técnico:

> “A API é o meio pelo qual a tela faz pedidos ao servidor e recebe respostas.”

### Slide 8 — Como o atendimento avança?

**Responsável:** Pedro. **Tempo:** 2 minutos.

Mostrar o fluxo habitual:

**Aberto → Em atendimento → Resolvido**

**Fala sugerida:**

> “O chamado começa como aberto. O atendente pode atualizar para em atendimento e, depois, para resolvido. O sistema também permite reabrir um chamado quando necessário.”

Destacar:

- Apenas o atendente altera o status.
- As datas são atualizadas no banco.
- O solicitante consulta o andamento.
- Para ver alterações feitas em outra sessão, é necessário recarregar a página.

**Cuidado na explicação:** esse é o fluxo habitual de atendimento; não apresentar como uma sequência de etapas obrigatoriamente imposta pelo sistema.

### Slide 9 — Onde ficam as informações?

**Responsável:** Davi. **Tempo:** 2 minutos.

Apresentar o PostgreSQL como o banco utilizado e simplificar as três tabelas principais:

| Tabela | O que armazena |
| --- | --- |
| `usuarios` | Nome, e-mail, hash da senha e perfil |
| `chamados` | Problema, solicitante, categoria, prioridade, status e datas |
| `sessoes` | Dados necessários para manter e reconhecer a sessão |

**Fala sugerida:**

> “Podemos imaginar as tabelas como conjuntos de registros organizados. Cada usuário possui um identificador, e o chamado guarda o identificador de quem o abriu. Assim, o sistema sabe quais chamados pertencem a cada pessoa.”

Usar um exemplo fictício:

> “O usuário de número 7 pode abrir vários chamados. Cada chamado tem seu próprio número, mas todos ficam ligados a esse usuário.”

Não é necessário mostrar comandos SQL durante essa explicação.

### Slide 10 — Demonstração do fluxo completo

**Responsável:** equipe. **Tempo:** 2 minutos.

Retomar o chamado aberto por Guilherme:

1. **Matheus:** mostrar a entrada com uma conta de atendente já preparada.
2. **Pedro:** localizar o chamado e mudar para “Em atendimento” e depois “Resolvido”.
3. **Guilherme:** voltar à sessão do solicitante, atualizar a página e mostrar o resultado.
4. **Davi:** relacionar o resultado ao armazenamento dos dados.

Usar duas sessões separadas, como uma janela normal e uma anônima, para manter solicitante e atendente conectados ao mesmo tempo.

**Frase de ligação:**

> “O que acabamos de ver reúne as quatro partes: a interface apresenta, o servidor verifica, as regras controlam o atendimento e o banco mantém o registro.”

### Slide 11 — O que entregamos e o que pode evoluir?

**Responsável:** Davi. **Tempo:** 1 minuto.

**Implementado:**

- Cadastro, login e logout.
- Abertura e consulta de chamados.
- Busca, filtros e contadores.
- Controle de acesso por perfil.
- Atualização do status pelo atendente.

**Possíveis melhorias futuras:**

- Anexos.
- Mensagens entre usuários.
- Paginação.
- Atualização em tempo real.

**Fala sugerida:**

> “A versão atual cobre o fluxo principal de registro e acompanhamento de solicitações. Há possibilidades de evolução, como anexos e mensagens, que ainda não fazem parte da implementação.”

O documento de validação registra testes aprovados para o MVP local. Caso mencionem essa evidência, expliquem que **validação local e publicação em produção são etapas diferentes**.

## 3. Como preparar os integrantes

Cada pessoa deve conseguir responder a três perguntas sobre sua parte:

1. **O que essa parte faz?**
2. **Por que ela é necessária?**
3. **Onde aparece no exemplo do computador sem internet?**

Para estudar no código, os pontos principais são os seguintes. Os caminhos partem da pasta `helpdesk/`:

| Integrante | Arquivos de referência |
| --- | --- |
| Guilherme | `frontend/view/pages/`, `frontend/src/css/style.css` e `frontend/src/js/chamados.js` |
| Matheus Alves | `backend/routes/auth.js` e `backend/security/` |
| Pedro | `backend/routes/chamados.js` e `backend/validator/chamados.js` |
| Davi | `backend/database/migrations/001_initial.sql`, README e documento de validação |

Esses arquivos servem para preparação. **Não é necessário projetar arquivos inteiros nem decorar código.**

## 4. Ensaio e preparação da demonstração

- Usar slides com pouco texto e imagens reais das telas.
- Explicar cada termo técnico na primeira vez em que aparecer.
- Preparar contas fictícias de solicitante e atendente.
- Ensaiar o fluxo completo com o servidor e o banco funcionando.
- Separar capturas das telas como alternativa se houver falha na demonstração.
- Cronometrar as falas e ensaiar as transições entre integrantes.
- Se perguntarem algo que alguém não sabe, responder com honestidade e encaminhar ao integrante responsável.

**A ideia central que todos devem conseguir explicar é: “O Help Desk registra um problema, controla quem pode acessá-lo e permite acompanhar sua resolução.”**

## Referências do projeto

- [README principal e cargos da equipe](../../README.md)
- [Registro de validação da Etapa 6](validacao-etapa-6.md)
- [Estrutura inicial do banco](../backend/database/migrations/001_initial.sql)
- [Rotas de autenticação](../backend/routes/auth.js)
- [Rotas de chamados](../backend/routes/chamados.js)
- [Integração das telas de chamados](../frontend/src/js/chamados.js)
