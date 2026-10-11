# InternRadar

Plataforma pessoal para centralizar vagas de estágio em tecnologia de fontes públicas autorizadas. O MVP terá sincronização manual, persistência, filtros e acesso ao anúncio original. Automação, notificações e IA ficam para fases posteriores.

A [especificação oficial v1.0](docs/requirements.md) está preservada. [Decisões complementares](docs/requirements-proposed-changes.md), [arquitetura](docs/architecture.md) e [Sprint 0](docs/sprint-0.md) registram o escopo e as evidências.

## Estado atual

S0-01/S0-02/S0-03 integradas. O lote S0-04/S0-05 implementa Next.js, NestJS, saúde com consulta real ao PostgreSQL, schema Prisma, migração e seed idempotente. A página inicial informa conexão, carregamento, falhas e nova tentativa. Não há coleta, listagem de vagas ou sincronizações implementadas nesta entrega.

```text
apps/web/src/app/           Next.js App Router, layout e página inicial
apps/web/src/components/    Estado da conexão com a API
apps/web/test/              Testes Chromium/Firefox com Playwright
apps/api/src/config/        Ambiente privado validado
apps/api/src/health/        Saúde da API e consulta real ao banco
apps/api/src/database/      Prisma Client, adapter-pg e módulo NestJS
apps/api/prisma/            Schema, migrações e seed
apps/api/test/              Testes HTTP, ambiente e persistência
compose.yaml               PostgreSQL desenvolvimento/testes separados
docs/                      Operação, decisões e evidências
```

## Preparação

- Node **24.21.0**, pnpm **12.12.0**, Docker Engine **29.8.2** e Compose **5.5.1**, validados no Ubuntu/WSL2.
- Use o checkout no filesystem do Ubuntu. Não misture dependências Windows/Linux. Nenhuma instalação global é necessária para o projeto.
- Antes de iniciar Docker, confira containers/volumes e portas. Preserve os recursos antigos: [operação e recuperação](docs/database.md).

```bash
pnpm install --frozen-lockfile
if [ ! -e .env ]; then cp .env.example .env; fi
if [ ! -e apps/web/.env.local ]; then cp apps/web/.env.example apps/web/.env.local; fi
```

Substitua os placeholders no `.env` por senhas locais distintas. Atualize `DATABASE_URL` e `TEST_DATABASE_URL` de acordo com seus respectivos `POSTGRES_*`/`POSTGRES_TEST_*`. Caracteres especiais nas credenciais precisam de percent-encoding na URL.

**Neste workspace**, PostgreSQL 16 nativo já ocupa 5432. O `.env` privado foi configurado para o projeto Compose `internradar-apps`, com desenvolvimento em **15432** e testes em **15433**. Os comandos abaixo usam esse arquivo automaticamente. Um clone novo usa os padrões 5432/5433 do exemplo; se estiverem ocupados, altere as portas e URLs antes de criar os containers. Não reutilize volumes Bookworm sem análise de compatibilidade.

## Iniciar

```sh
pnpm db:config
pnpm db:up
pnpm db:test:up
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Acesse **<http://localhost:3000>**. `pnpm dev` inicia os dois workspaces; também é possível usar terminais separados:

```sh
pnpm --filter @internradar/api dev
pnpm --filter @internradar/web dev
```

A API usa `127.0.0.1:3001`. O navegador utiliza apenas `NEXT_PUBLIC_API_BASE_URL`; credenciais permanecem na API. `API_PORT`, `CORS_ORIGINS` e a URL pública precisam ser coerentes ao trocar portas. Detalhes: [aplicações e testes](docs/applications.md).

## Confirmar o funcionamento

```sh
curl --fail http://localhost:3001/api/v1/health
pnpm --filter @internradar/api db:migrate:status
pnpm db:status
```

A saúde retorna `{"status":"ok","service":"internradar-api","database":{"status":"connected"}}` **somente após `SELECT 1` executado pelo Prisma**. Falha no banco retorna 503 sanitizado; `/health` redireciona com 307 para a rota canônica. Isso verifica a conexão, não substitui a checagem de migrações/seed. A interface diferencia banco indisponível de falha de conexão com a API.

O seed cadastra **Figma/Greenhouse e Spotify/Lever**, com boards verificados. Reexecuções preservam IDs e `enabled=false`; nenhuma vaga é coletada. A verificação Ashby ficou pendente por HTTP 403. [Fontes e evidências](docs/seed-sources.md).

## Qualidade e testes

Com ambos os bancos em execução e migrações aplicadas:

```sh
pnpm --filter @internradar/web exec playwright install chromium firefox
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm test:integration
pnpm workspace:list
```

`pnpm test` executa testes da API e dos navegadores; requer os builds da API e web. Encerre os dev servers antes dos testes. Playwright inicia servidores próprios em 3100/3001. `test:integration` exige `TEST_DATABASE_URL`, confirma que o cluster difere do diário e cria um schema novo no banco de testes. Aplica a migração, testa constraints/seed e preserva o schema para inspeção; não cria volumes adicionais nem apaga dados existentes.

`pnpm db:verify` continua disponível para homologar a infraestrutura em outro projeto Compose. Ele cria volumes adicionais: não precisa ser repetido em cada alteração de aplicação. `pnpm format <arquivos>` formata apenas os caminhos indicados; especificação e lockfile ficam preservados.

Para executar os artefatos compilados, após `pnpm build`, use `pnpm --filter @internradar/api start` e `pnpm --filter @internradar/web start` em terminais separados. Encerre os aplicativos com Ctrl+C; `pnpm db:stop` e `pnpm db:test:stop` param os bancos sem apagar volumes.

## Contribuição e próximos passos

[CONTRIBUTING.md](CONTRIBUTING.md) descreve Issue → branch → Conventional Commits → checks → PR → revisão → merge autorizado. As entregas deste lote estão nas [Issues #6](https://github.com/felipe-rodriguesz/InternRadar/issues/6) e [#7](https://github.com/felipe-rodriguesz/InternRadar/issues/7).

S0-06 adicionará GitHub Actions com estes comandos reais. Conectores, sincronização e consulta de vagas pertencem às Sprints 1/2. Deploy público, autenticação, licença e automações continuam fora deste lote; o projeto deve permanecer local.

Os testes de navegador usam a URL pública padrão `http://127.0.0.1:3001/api/v1` incorporada ao build. Se alterá-la para desenvolvimento, refaça o build com esse valor antes de executar a suíte. Os servidores de teste recusam portas já ocupadas.
