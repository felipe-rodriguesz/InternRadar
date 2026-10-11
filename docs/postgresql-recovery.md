# Recuperação da imagem PostgreSQL — 11/10/2026

S0-03 homologada em Ubuntu/WSL2. Este registro complementa a [Sprint 0](sprint-0.md), a [operação do banco](database.md) e o [ADR-002](decisions/ADR-002-postgresql-prisma.md). A recuperação não removeu recursos anteriores nem reutilizou seus volumes.

## Ambiente e inventário preservado

Docker Engine 29.8.2 e Compose 5.5.1 responderam durante o diagnóstico e os testes. Os clientes Ubuntu e Windows retornaram o mesmo Engine ID `6400e8db-a5da-49fc-8e50-02d142a8749f`, linux/x86_64. Havia aproximadamente 17 GiB livres no C: e 953 GiB livres no filesystem virtual dos dados Docker; o crescimento do VHDX continua limitado pelo espaço físico do host.

Recursos presentes antes desta recuperação, conferidos novamente ao final:

- Containers parados `internradar-check-e3dcaedf6932-postgres-1` e `internradar-check-e3dcaedf6932-postgres-test-1`.
- Volumes `internradar-check-e3dcaedf6932_postgres_data` e `internradar-check-e3dcaedf6932_postgres_test_data`.
- Redes `development`/`testing` dos projetos `internradar-check-e3dcaedf6932` e `internradar-check-0c06fac7328e`.
- Imagem PostgreSQL Bookworm anterior, imagem hello-world e redes padrão.

Nenhum desses recursos foi removido, reiniciado ou montado em novos containers. O kernel e os logs do Engine continham erros de armazenamento históricos; não foram observados novos erros de I/O/SIGBUS/filesystem durante esta recuperação. Isso comprova o intervalo observado, não a saúde permanente do armazenamento.

## Isolamento da falha

Imagem anterior: `postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826`, linux/amd64. Configuração original: `ENTRYPOINT ["docker-entrypoint.sh"]`, `CMD ["postgres"]`.

| Inspeção                                                                                       | Resultado                                                                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `docker diff` nos dois containers antigos e em container novo antes de executar                | Nenhuma alteração na camada gravável                                                                                |
| Entrypoint extraído do TAR retornado por `docker cp ... -`                                     | 0 bytes nos containers antigos e no novo                                                                            |
| Container diagnóstico novo, sem volumes existentes, rootfs somente leitura e PGDATA em tmpfs   | `/bin/sh` executou e confirmou o script com 0 bytes; `postgres --version` falhou com `libzstd.so.1: file too short` |
| Entrypoint obtido diretamente de uma camada do registry oficial, com SHA-256 do blob conferido | 14.577 bytes; script Bash válido                                                                                    |

O defeito não se limita ao filesystem gravável de um container antigo. As evidências apontam para conteúdo local compartilhado da imagem ou seu snapshot descompactado. Não foi determinado se a inconsistência está no blob local comprimido ou no snapshot, nem comprovada sua causa nos incidentes anteriores. A imagem oficial remota não apresentou o entrypoint vazio. O container diagnóstico `internradar-imagecheck-51f1769e03f7` permanece parado para inspeção.

## Imagem recuperada e compatibilidade

Nova referência: `postgres:17.11-trixie@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3`.

- Variante oficial Debian 13, linux/amd64, PostgreSQL **17.11** (`17.11-1.pgdg13+2`).
- Manifest amd64: `sha256:3cec7eb015ba8adb28139fa5c83b8489cdf0e666e53dfdf20f598ae0cc8739e3`. Nenhum digest de camada comprimida compartilhado com a variante anterior; download efetivo de novas camadas.
- Mesmo caminho persistente `/var/lib/postgresql/data`; ENTRYPOINT e CMD originais mantidos no Compose.
- Entrypoint local com 14.577 bytes e SHA-256 `9c440299ae04a0a79d55b8bf03307036d890a40979d2fb698073c9050d4b20a5`, idêntico ao obtido do registry. `bash -n` aprovado.
- `postgres`, `initdb` e `pg_isready` reportaram 17.11. Checksums de sete arquivos essenciais conferidos com os manifests dpkg: bash, dash, libzstd, postgres, initdb, pg_isready e psql.
- Execução com entrypoint original aprovada antes de alterar o Compose; diagnósticos efêmeros não montaram volumes existentes.

Não houve mudança para Alpine/musl. Entretanto, Debian Bookworm → Trixie altera glibc/ICU; a glibc observada na nova imagem foi 2.41. A mesma major do PostgreSQL e o mesmo caminho de dados **não garantem compatibilidade das ordenações de um cluster antigo**. Havendo dados previamente inicializados, é necessário backup, análise das versões de collation e plano aprovado de reconstrução dos objetos afetados ou migração lógica. Nenhum desses procedimentos foi executado nesta entrega. Referências: [imagem oficial](https://hub.docker.com/_/postgres) e [PostgreSQL: versões de collation](https://www.postgresql.org/docs/17/sql-altercollation.html).

## Homologação real

`pnpm db:config` e `pnpm db:verify` encerraram com status 0. Projeto da suíte: `internradar-check-74f4d78f5fa0`, criado com portas e credenciais aleatórias e dois volumes novos.

| Critério                                                         | Resultado                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Configuração válida, senha ausente e porta inválida              | Configuração aceita; erros identificáveis nas duas entradas inválidas                                               |
| Proteção anterior à criação                                      | Modelo resolvido restringe montagens aos dois volumes do projeto novo; rejeita volumes externos/existentes          |
| Teste negativo da proteção em cópia temporária do script/Compose | Volume externo existente recusado antes de criar recursos; inventário de containers, volumes e redes inalterado     |
| Inicialização                                                    | Dois healthchecks healthy; bindings somente em 127.0.0.1                                                            |
| Conexão                                                          | Protocolo PostgreSQL pelas duas portas do host e `SELECT 1` autenticado via TCP dentro de cada container            |
| Autenticação                                                     | Senha SQL incorreta rejeitada                                                                                       |
| Isolamento                                                       | Clusters com identificadores distintos, redes/volumes diferentes e marcadores `development`/`testing` independentes |
| Persistência                                                     | Marcador de desenvolvimento preservado após restart e recriação de seu container; marcador de testes intacto        |
| Encerramento                                                     | Dois containers próprios parados, exit 0; logs de disponibilidade e encerramento normal; volumes preservados        |

A suíte criou somente uma tabela de prova nos bancos novos. Não há schema, migrações ou seed do produto. A conexão integrada de Prisma/NestJS será comprovada na S0-05; a conexão host desta suíte verifica o protocolo, enquanto a consulta SQL autenticada usa o cliente do container.

Ao final ficaram cinco containers parados: dois antigos, um diagnóstico e dois da suíte aprovada. Os quatro volumes, nove redes e três imagens permanecem registrados. `docker system df` reportou 1,283 GB em imagens e 95,64 MB em volumes; o C: tinha aproximadamente 16 GiB livres. Os recursos adicionais consomem espaço; qualquer limpeza futura continua sujeita a inventário e autorização, sem comandos destrutivos nesta entrega.
