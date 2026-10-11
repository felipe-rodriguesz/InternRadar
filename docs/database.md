# PostgreSQL local

Referências: [ADR-002](decisions/ADR-002-postgresql-prisma.md), [ADR-006](decisions/ADR-006-configuracao-de-ambientes.md) e RF-001/HU-01. Compose executa somente os bancos; aplicativos ficam no host e serão inicializados na S0-04.

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

Os bancos exigem SCRAM para conexões TCP. O healthcheck `pg_isready` verifica disponibilidade, não substitui esse teste de autenticação. A API/Prisma no host usarão loopback; o cliente da aplicação e sua conexão integrada serão validados na S0-05.

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

Sem Prisma, migrações ou seed nesta entrega. O banco separado de testes será consumido pelos testes de persistência da S0-05; a CI correspondente será definida na S0-06.
