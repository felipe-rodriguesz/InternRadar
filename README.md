# InternRadar

Plataforma Full Stack pessoal para centralizar vagas de estágio de fontes públicas autorizadas. O MVP terá sincronização manual, persistência, consulta e interface básica; automação, alertas e IA ficam para fases posteriores.

A [especificação oficial v1.0](docs/requirements.md) permanece íntegra. [Alterações propostas](docs/requirements-proposed-changes.md) registram decisões complementares já aprovadas sem reescrever o original.

## Estado e arquitetura

S0-01 integrada pelo [PR #2](https://github.com/felipe-rodriguesz/InternRadar/pull/2). O lote S0-02/S0-03 prepara documentação e PostgreSQL local. S0-02 está finalizada; a homologação do banco está bloqueada por um entrypoint vazio na imagem local, e o lote segue em Draft PR. Resultados e pendências estão no [acompanhamento da Sprint 0](docs/sprint-0.md).

```text
apps/web/                 Frontend Next.js, inicialização na S0-04
apps/api/                 Backend NestJS modular, inicialização na S0-04
compose.yaml              PostgreSQL de desenvolvimento e testes
scripts/verify-database.mjs Testes reais e isolados da infraestrutura
.github/                  Templates de Issues e Pull Request
CONTRIBUTING.md            Fluxo de contribuição e qualidade
docs/architecture.md      Visão das camadas e decisões
docs/decisions/           ADRs
docs/database.md          Operação e diagnóstico do banco
docs/requirements.md      Especificação original preservada
docs/sprint-0.md          Rastreabilidade e evidências
```

[Arquitetura e ADRs](docs/architecture.md) explicam monorepo com pnpm workspaces, separação web/API, backend modular, persistência, APIs públicas, ambientes e GitHub Flow.

## Pré-requisitos e instalação

- Node **24.21.0** e pnpm **12.12.0**, registrados no projeto. Com nvm instalado, `nvm use` seleciona a versão existente.
- Git, Docker Desktop integrado ao WSL2 e Docker Compose. As versões verificadas são Docker Engine/CLI **29.8.2** e Compose **5.5.1**.
- No Windows, usar o checkout no sistema de arquivos do Ubuntu/WSL2. Não misturar instalações de dependências Windows/Linux.

```sh
pnpm install --frozen-lockfile
pnpm workspace:list
pnpm lint
pnpm format:check
```

Ferramentas compartilhadas ficam na raiz; dependências de execução pertencerão ao aplicativo que as utiliza. Versões diretas são exatas e resoluções transitivas ficam no lockfile único. TypeScript strict é herdado pelos aplicativos. O lint analisa os arquivos JS/TS existentes; typecheck/build/test das aplicações serão introduzidos na S0-04, e a CI na S0-06.

`pnpm format <arquivos>` escreve somente nos caminhos indicados. Prettier não altera `docs/requirements.md` ou `pnpm-lock.yaml`. EditorConfig e atributos Git mantêm LF/UTF-8, com CRLF para scripts específicos Windows e exceção restrita às quebras Markdown do original.

## Executar e verificar PostgreSQL

Siga [docs/database.md](docs/database.md) para criar o `.env` privado a partir do exemplo, substituir placeholders e manter `DATABASE_URL` coerente. Os exemplos são versionados; arquivos locais, senhas e artefatos são ignorados.

```sh
pnpm db:config
pnpm db:up
pnpm db:status
pnpm db:logs
pnpm db:test:up
pnpm db:verify
pnpm db:test:stop
pnpm db:stop
```

Desenvolvimento usa `127.0.0.1:5432`; testes usam `127.0.0.1:5433`, com portas configuráveis, clusters/redes/volumes distintos e profile `test`. Imagem PostgreSQL **17.11-bookworm**, fixada por digest OCI. Stop/restart preservam os volumes diários.

`db:verify` cria um projeto Docker temporário próprio e testa configuração, saúde, conexão, autenticação, persistência após restart/recriação e isolamento. Ao finalizar, para seus containers e preserva os volumes; o nome do projeto é informado no terminal. Não usa nem apaga dados diários. O teste é independente do `.env` local.

Frontend recebe somente `apps/web/.env.local` com URL pública da API. Não copie credenciais em `NEXT_PUBLIC_*`. A API/Prisma carregarão o ambiente privado da raiz nas S0-04/S0-05.

## Contribuição e próximos passos

[CONTRIBUTING.md](CONTRIBUTING.md) descreve Issue → branch → commits Conventional Commits → checks → PR → revisão → merge autorizado. O lote atual está registrado nas [Issues #3](https://github.com/felipe-rodriguesz/InternRadar/issues/3) e [#4](https://github.com/felipe-rodriguesz/InternRadar/issues/4), no [Milestone Sprint 0](https://github.com/felipe-rodriguesz/InternRadar/milestone/1).

S0-04 inicializará aplicações, carregamento de ambiente e saúde/comunicação. S0-05 introduzirá Prisma 7, entidades, migrações e seed idempotente. S0-06 acrescentará CI e verificará a fundação completa. Ainda não há aplicativos executáveis, schema do produto, seed, coleta de vagas ou deploy público. A licença continua em aberto conforme Q-10.
