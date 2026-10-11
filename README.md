# InternRadar

Plataforma pessoal para centralizar vagas de estágio em tecnologia de fontes públicas autorizadas. O MVP terá sincronização manual, persistência, filtros e acesso ao anúncio original. Automação, notificações e IA ficam para fases posteriores.

A [especificação oficial v1.0](docs/requirements.md) está preservada. [Decisões complementares](docs/requirements-proposed-changes.md), [arquitetura](docs/architecture.md) e [Sprint 0](docs/sprint-0.md) registram o escopo e as evidências.

## Estado atual

Sprint 0 e S1-01/S1-02 integradas. O lote S1-03/S1-04/S1-05 implementa sincronização manual Greenhouse, persistência auditável, API paginada e interface `/jobs`. A página inicial leva à pesquisa e mantém a saúde da API. Os anúncios vêm das fontes monitoradas e podem incluir diferentes níveis/localizações; não são classificados automaticamente como estágios.

```text
apps/web/src/app/           Next.js App Router, layout e página inicial
apps/web/src/components/    Estado da conexão com a API
apps/web/test/              Testes Chromium/Firefox com Playwright
apps/api/src/config/        Ambiente privado validado
apps/api/src/health/        Saúde da API e consulta real ao banco
apps/api/src/database/      Prisma Client, adapter-pg e módulo NestJS
apps/api/src/connectors/    Contratos, normalização e Greenhouse
apps/api/src/sync/          CLI, SyncRun e upsert transacional
apps/api/src/jobs/          Consulta paginada com filtros
apps/api/prisma/            Schema, migrações e seed
apps/api/test/              Testes HTTP, ambiente e persistência
compose.yaml               PostgreSQL desenvolvimento/testes separados
.github/workflows/ci.yml    Checks e integração no GitHub Actions
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
pnpm sync:jobs --list
# Copie o UUID da fonte Figma/Greenhouse habilitada:
pnpm sync:jobs --source UUID_DA_FONTE
pnpm dev
```

Acesse **<http://localhost:3000>**, escolha **Buscar oportunidades**, ou abra **<http://localhost:3000/jobs>**. Pesquise, por exemplo, `intern`; isso é uma busca textual, não uma classificação automática. `pnpm dev` inicia os dois workspaces; também é possível usar terminais separados:

```sh
pnpm --filter @internradar/api dev
pnpm --filter @internradar/web dev
```

A API usa `127.0.0.1:3001`. O navegador utiliza apenas `NEXT_PUBLIC_API_BASE_URL`; credenciais permanecem na API. `API_PORT`, `CORS_ORIGINS` e a URL pública precisam ser coerentes ao trocar portas. Detalhes: [aplicações e testes](docs/applications.md).

## Confirmar o funcionamento

```sh
curl --fail http://localhost:3001/api/v1/health
curl --fail 'http://localhost:3001/api/v1/jobs?q=intern&pageSize=20'
pnpm --filter @internradar/api db:migrate:status
pnpm db:status
```

A saúde retorna `{"status":"ok","service":"internradar-api","database":{"status":"connected"}}` **somente após `SELECT 1` executado pelo Prisma**. Falha no banco retorna 503 sanitizado; `/health` redireciona com 307 para a rota canônica. Isso verifica a conexão, não substitui a checagem de migrações/seed. A interface diferencia banco indisponível de falha de conexão com a API.

O seed cadastra **Figma/Greenhouse, Ashby/Ashby e Spotify/Lever**, com boards verificados. Reexecuções preservam IDs e `enabled=false`; nenhuma vaga é coletada pelo seed. O board oficial Ashby foi homologado na S2-01. [Fontes e evidências](docs/seed-sources.md).

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

`pnpm test` executa testes da API e dos navegadores; requer os builds da API e web. Encerre os dev servers antes dos testes. Playwright inicia servidores próprios em 3100/3001 e valida um banco vazio real; depois, o runner grava fixtures em seu schema isolado e testa a listagem. Nenhuma fixture entra no banco diário. `test:integration` exige `TEST_DATABASE_URL`, confirma que o cluster difere do diário e cria um schema novo no banco de testes. Aplica a migração, testa constraints/seed e preserva o schema para inspeção; não cria volumes adicionais nem apaga dados existentes.

`pnpm db:verify` continua disponível para homologar a infraestrutura em outro projeto Compose. Ele cria volumes adicionais: não precisa ser repetido em cada alteração de aplicação. `pnpm format <arquivos>` formata apenas os caminhos indicados; especificação e lockfile ficam preservados.

Para executar os artefatos compilados, após `pnpm build`, use `pnpm --filter @internradar/api start` e `pnpm --filter @internradar/web start` em terminais separados. Encerre os aplicativos com Ctrl+C; `pnpm db:stop` e `pnpm db:test:stop` param os bancos sem apagar volumes.

## Greenhouse — consulta sem persistência

```sh
pnpm test:unit
pnpm greenhouse:check figma
```

O primeiro comando testa contratos, normalização e falhas sem internet ou banco. O segundo consulta o board público real e imprime contagens/diagnóstico, sem importar vagas no PostgreSQL. Retorna erro se a coleta falhar; não simula sucesso. Não há endpoint administrativo.

[Conectores](docs/connectors.md) descreve mapeamento, URLs permitidas, sanitização, timeout/retries, fixtures e a verificação real. Datas/modalidades ausentes permanecem desconhecidas. O contrato permite adicionar outros adapters sem alterar a listagem.

## Sincronização e consulta

`pnpm sync:jobs --source UUID` sincroniza uma fonte; sem `--source`, todas as habilitadas. `--concurrency 1` reduz o máximo padrão de duas por processo. Cada tentativa gera SyncRun; reexecuções atualizam anúncios sem duplicar ou alterar firstSeenAt. Falhas não apagam vagas. Nenhum endpoint administrativo é exposto.

Os três conectores estão implementados. O comando global seleciona o adapter por plataforma; uma falha permanece isolada à fonte e faz o CLI retornar exit code 1 sem ocultar os demais resultados. Detalhes de contadores, falhas, RUNNING incompleto, filtros e datas: [sincronização e API](docs/synchronization.md).

Fluxo: **Greenhouse → Connector → SyncService → Prisma → PostgreSQL → GET /jobs → Next.js**. O navegador consulta exclusivamente a API InternRadar; sincronização acontece somente pelo CLI. A saúde executa SELECT 1; as vagas são lidas da base, sem consultar a origem durante a navegação.

## Contribuição e próximos passos

[CONTRIBUTING.md](CONTRIBUTING.md) descreve Issue → branch → commits → checks → PR → revisão → merge autorizado. Lote atual: [#13](https://github.com/felipe-rodriguesz/InternRadar/issues/13), [#14](https://github.com/felipe-rodriguesz/InternRadar/issues/14) e [#15](https://github.com/felipe-rodriguesz/InternRadar/issues/15). [Sprint 1](docs/sprint-1.md) reúne evidências e limitações; [CI](docs/ci.md) reproduz checks e testes isolados.

Sprint 2: Ashby/Lever, detalhes de vaga, fontes/histórico e resiliência ampliada. Nenhum desses incrementos foi antecipado. Deploy público, autenticação, licença e automações permanecem fora deste lote; mantenha a aplicação local.

Os testes de navegador usam a URL pública padrão `http://127.0.0.1:3001/api/v1` incorporada ao build. Se alterá-la para desenvolvimento, refaça o build com esse valor antes de executar a suíte. Os servidores de teste recusam portas já ocupadas.

## Sprint 2 — múltiplas fontes e acompanhamento

Agora: Greenhouse, Ashby e Lever; detalhes da vaga; fontes e histórico de sincronizações. A coleta é manual por CLI. No navegador, as páginas leem exclusivamente a API InternRadar e os dados persistidos.

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm db:up
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm sync:jobs --list
pnpm sync:jobs --concurrency 1
pnpm dev
```

Execute os comandos de banco somente após conferir o destino privado do seu `.env`, conforme [banco](docs/database.md); preserve o projeto/volumes Trixie já configurados. O seed não duplica fontes nem reativa fontes desabilitadas. Para coletar apenas uma fonte, `pnpm sync:jobs --source UUID`.

Abra [início](http://localhost:3000), [vagas](http://localhost:3000/jobs), [fontes](http://localhost:3000/sources) e [histórico](http://localhost:3000/sync-runs). Clique no título para detalhes internos; a candidatura continua no anúncio original. A presença de uma vaga não comprova disponibilidade de candidatura, estágio ou localização brasileira.

Checks: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test:unit`, `pnpm --filter @internradar/api test:http`, `pnpm test:integration` e `pnpm --filter @internradar/web test`. Antes dos testes com banco, inicie o profile test conforme [database.md](docs/database.md). Browsers precisam das portas 3001/3100 livres e builds prontos. Fixtures ficam em schemas novos no cluster separado; não alteram as vagas diárias.

[Entrega e evidências Sprint 2](docs/sprint-2.md) · [Contratos HTTP](docs/synchronization.md) · [Conectores](docs/connectors.md).
