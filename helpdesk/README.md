# Help Desk · IFCE Campus Boa Viagem

![Help Desk — Conectar pessoas. Organizar soluções.](docs/assets/helpdesk-banner.svg)

O [README principal do projeto](../README.md) reúne a apresentação, a equipe, as funcionalidades, a instalação e as orientações de segurança.

## Início rápido nesta máquina

Com o terminal nesta pasta, Node.js 24.x e o banco local já preparado:

```bash
npm ci
npm run local
```

Acesse **http://localhost:3333**. Encerre o servidor com **Ctrl+C** e, se necessário, o banco com `npm run db:local:stop`.

**Acabou de baixar o projeto?** Siga a [configuração em outro computador](../README.md#configurar-em-outro-computador). O banco em `.local/` e as configurações em `env/` são privados e não acompanham o repositório. O modelo público fica em [`.env.example`](.env.example).
