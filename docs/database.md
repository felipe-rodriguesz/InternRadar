# PostgreSQL local

Referências: [ADR-002](decisions/ADR-002-postgresql-prisma.md), [ADR-006](decisions/ADR-006-configuracao-de-ambientes.md) e RF-001/HU-01. Compose executa somente os bancos; Next.js e NestJS executam no host.

## Preparar

Docker Desktop deve estar integrado ao Ubuntu/WSL2 e responder a `docker version`. Node/pnpm seguem as versões da raiz. Copie `.env.example` para `.env` somente se o destino estiver ausente:

```bash
if [ ! -e .env ]; then cp .env.example .env; fi
```

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Substitua `CHANGE_ME_LOCAL_ONLY` e `CHANGE_ME_TEST_ONLY` na cópia local por senhas distintas. Mantenha `DATABASE_URL` coerente com usuário, senha, porta e nome do banco de desenvolvimento. A URL é literal; use percent-encoding em credenciais com caracteres especiais. O frontend nunca recebe essa URL. `.env` é ignorado; exemplos não contêm credenciais reais.

## Iniciar, inspecionar e parar

```sh
pnpm db:config
pnpm db:up
pnpm db:status
pnpm db:logs
pnpm db:test:up
pnpm db:test:logs
pnpm db:test:stop
pnpm db:stop
```

`db:up` aguarda saúde e inicia apenas desenvolvimento. `db:test:up` ativa somente `postgres-test`. `db:status` mostra os dois serviços existentes. Os comandos de parada preservam dados.

| Serviço         | Porta padrão no host | Banco padrão       | Volume                           | Rede                      |
| --------------- | -------------------- | ------------------ | -------------------------------- | ------------------------- |
| `postgres`      | `127.0.0.1:5432`     | `internradar`      | `internradar_postgres_data`      | `internradar_development` |
| `postgres-test` | `127.0.0.1:5433`     | `internradar_test` | `internradar_postgres_test_data` | `internradar_testing`     |

Portas são configuráveis por `POSTGRES_PORT`/`POSTGRES_TEST_PORT` e devem ser diferentes/livres. O nome de projeto Compose padrão é `internradar`; `-p` altera o prefixo dos recursos. Serviços não usam nomes globais fixos de container.

Imagem: `postgres:17.11-trixie@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3`. O digest fixa o índice multiarch; a tag explica a versão. Atualizações exigem revisão explícita. PostgreSQL 17 usa volume em `/var/lib/postgresql/data`. [Imagem oficial](https://hub.docker.com/_/postgres).

A base Debian passou de Bookworm para Trixie para obter camadas oficiais independentes do conteúdo local inconsistente. A homologação usou apenas volumes novos. Embora PostgreSQL 17.11 e o caminho dos dados sejam os mesmos, bibliotecas de collation podem mudar entre bases: **não reutilize automaticamente um cluster inicializado com a imagem anterior**. Migração de dados existentes exige backup, análise de compatibilidade e procedimento aprovado. [Diagnóstico, evidências e decisão](postgresql-recovery.md).

Conexão SQL autenticada por TCP, usando o cliente existente no container sem imprimir a senha:

```sh
docker compose exec postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -c "SELECT current_database(), version();"'
docker compose --profile test exec postgres-test sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -c "SELECT current_database();"'
```

Os bancos exigem SCRAM para conexões TCP. O healthcheck `pg_isready` verifica disponibilidade, não substitui esse teste de autenticação. A API/Prisma usa loopback e seu endpoint de saúde executa uma consulta SQL real.

## Verificação automatizada

```sh
pnpm db:verify
```

O script usa o mesmo Compose com nome de projeto único, portas disponíveis, credenciais aleatórias e `.env` temporário vazio. Não usa o banco diário nem depende de seu `.env`. Antes de criar containers, confere a configuração resolvida: aceita somente os dois volumes nomeados do projeto novo, recusa volumes externos/existentes e montagens fora desse contrato.

Ele verifica configuração válida, rejeição de senha vazia/porta inválida, saúde dos dois containers, protocolo PostgreSQL pelas portas do host, SQL autenticado, rejeição de senha incorreta e isolamento de clusters/redes/volumes. Uma tabela de prova existe somente nos bancos temporários: dados devem sobreviver ao restart e à recriação do container de desenvolvimento, sem alterar o marcador do banco de testes. Isso não é schema, migração ou seed do produto.

Após validar labels/propriedade, para somente os containers do projeto temporário e preserva seus volumes. O nome do projeto aparece no terminal para inspeção posterior. Cada execução cria recursos isolados adicionais; qualquer remoção futura exige verificar o impacto e obter autorização. Falhas retornam status diferente de zero, inclusive erro ao parar containers. Recursos de uso diário ficam preservados. Evidências executadas e limitações: [Sprint 0](sprint-0.md).

## Diagnóstico e persistência

- `docker compose config --quiet` identifica variáveis obrigatórias ausentes e sintaxe/portas inválidas sem imprimir o ambiente resolvido.
- `db:logs` e `db:test:logs` mostram mensagens PostgreSQL; logs locais têm rotação de 10 MB, até três arquivos por serviço.
- Porta ocupada causa erro de bind; escolha uma porta livre e ajuste a URL correspondente.
- Alterar `.env` **não altera credenciais de um volume já inicializado**. Use procedimento SQL autorizado ou restaure um backup conforme a situação; não apague dados para tentar corrigir autenticação.
- Restart e recriação reutilizam os volumes. `docker compose down` preserva volumes; `down --volumes` do projeto diário apagaria os bancos e não deve ser usado sem verificar dados, backup e autorização.
- Falhas nativas no CLI do Docker Desktop/WSL e daemon indisponível são problemas de ambiente; não demonstram sucesso dos testes SQL. Restabeleça Docker Desktop antes de repetir `db:verify`.
- Se um container próprio ficar unhealthy, consulte `docker logs <nome-do-container>` mesmo após sua parada. A falha anterior `exec format error` foi isolada comparando containers novos, camada gravável e conteúdo do registry; a recuperação e a homologação concluída constam no [registro do diagnóstico](postgresql-recovery.md). Engine acessível e imagem listada não comprovam que PostgreSQL pode executar; não apague volumes nem mascare o erro com overrides.

## Prisma, migrações e seed — S0-05

O schema em `apps/api/prisma/schema.prisma` define Company, JobSource, Job e SyncRun. A migração `20261011063000_init` inclui enums, FKs, índices únicos e CHECKs/trigger complementares. O diretório de migrações é versionado; client gerado é ignorado.

```sh
pnpm prisma:generate
pnpm db:migrate
pnpm --filter @internradar/api db:migrate:status
pnpm db:seed
pnpm test:integration
```

`db:migrate` aplica migrações existentes com `migrate deploy`, sem reset, shadow database ou geração automática. A migração inicial foi gerada com `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` e revisada antes da aplicação. CHECKs SQL reforçam contadores não negativos e campos mínimos; trigger impede alterar `firstSeenAt`. Não substituir migrações por edições manuais no banco.

Prisma CLI lê `.env` explicitamente por `prisma.config.ts`. `DATABASE_URL` atende à API/seed; `TEST_DATABASE_URL` deve apontar ao cluster separado e corresponder a POSTGRES_TEST_DB/POSTGRES_TEST_PORT. O teste compara os identificadores dos clusters, cria somente um schema novo e aplica nele a migração. Não reutiliza/limpa schemas anteriores. A mesma configuração de schema é aplicada ao Prisma e ao search_path do pg; consultas SQL brutas também ficam isoladas.

O seed faz upsert das duas [fontes verificadas](seed-sources.md), preserva a associação existente e `enabled=false`. Não contém vagas, não faz coleta e não exige internet para executar. Testes usam fixtures explicitamente identificadas no schema isolado.

## Ambiente desta homologação

O PostgreSQL 16 nativo do Ubuntu já ocupava 5432; não foi parado nem alterado. A tentativa inicial deixou `internradar-postgres-1` em estado created, com volume `internradar_postgres_data`, preservados. O `.env` privado usa COMPOSE_PROJECT_NAME=internradar-apps, POSTGRES_PORT=15432 e POSTGRES_TEST_PORT=15433, com URLs coerentes. Os volumes diários novos são `internradar-apps_postgres_data` e `internradar-apps_postgres_test_data`; ambos foram inicializados com o digest Trixie homologado.

Todos os recursos das recuperações anteriores continuam preservados. Não foi repetida a suíte db:verify neste lote: sua homologação anterior permanece válida, e a nova entrega testa a aplicação nos dois clusters diários separados. A [CI](ci.md) usa dois service containers efêmeros no runner, sem acessar estes volumes locais.

## Sincronização e testes da listagem

S1-03 utiliza as tabelas/constraints existentes, sem nova migração nem mudança de digest. Persistência usa upsert e lock da linha da fonte somente durante a transação; gravação das vagas e SUCCESS são atômicos. [ADR-005](decisions/ADR-005-politica-de-datas-e-status.md) descreve o tratamento de rollback/RUNNING.

`test:integration` executa a suíte original em schema check_<uuid> e sincronização/HTTP em jobs_<uuid>. O runner de browsers cria browser_<uuid>, primeiro vazio e depois alimentado por fixtures identificadas. Guardas comparam porta, banco e system_identifier antes de qualquer escrita; contagens do banco diário são verificadas no final. Schemas permanecem disponíveis, inclusive triggers que simulam falhas exclusivamente no schema de testes. Não há DROP, reset ou limpeza de recursos antigos.

## S2-01 — Visibilidade explícita

Migração `20261011083000_job_visibility`: somente ADD COLUMN Job.isListed boolean NOT NULL DEFAULT true. Aplica-se com `pnpm db:migrate`; não há reset, exclusão, alteração dos IDs ou de firstSeenAt. Foi testada em bancos vazios no cluster separado e aplicada sobre as 150 vagas reais da Figma, cuja identidade/datas foram conferidas após a coleta. O índice/trigger de imutabilidade e as constraints anteriores permanecem.

O seed inclui três boards verificados, preservando enabled existente. Ashby false explícito atualiza visibilidade; JobsService oculta a vaga da busca, sem apagá-la nem inferir encerramento. Detalhes mostram a condição. Veja [ADR-009](decisions/ADR-009-visibilidade-e-consultas.md).

Não apagar schemas criados pelos testes para “limpar” resultados; continuam preservados. As verificações de integração comparam as contagens do banco diário antes/depois e recusam usar o mesmo cluster. A demonstração real é uma operação separada, executada somente após a suíte liberar essas verificações.
