# ADR-008 — Aplicações, runtime Prisma e testes isolados

Status: aceito no escopo S0-04/S0-05. Referências: RNF-003/004/006/012/015; HU-01/02/10/12; seção 8 e AC-09.

## Contexto

Os workspaces precisam de aplicações executáveis e Prisma 7 comprovado em geração, compilação e runtime, preservando o PostgreSQL homologado e os recursos anteriores.

## Decisão

- Next.js App Router com página/layout de servidor e um componente cliente para consultar saúde. React/Tailwind, sem bibliotecas extras de UI ou conexões diretas ao banco.
- NestJS modular em CommonJS explícito, TypeScript `NodeNext`, injeção por tokens explícitos e client `prisma-client` com `moduleFormat = "cjs"`, gerado dentro de `src/generated/prisma` e compilado com a API.
- Prisma CLI/client/adapter-pg 7.10.0 e pg 8.23.1. A URL fica no config Prisma 7 e no ambiente privado, não no schema nem no frontend.
- Saúde executa consulta real por Prisma; falha de banco retorna 503 sanitizado. Conexão lazy permite iniciar a API e diagnosticar indisponibilidade sem declarar sucesso.
- UUIDs nativos, timestamps `timestamptz(3)`, FKs com delete Restrict, região GLOBAL obrigatória, índices únicos e defaults da especificação. CHECKs SQL versionados reforçam contadores não negativos/campos mínimos/URL http(s); trigger preserva `firstSeenAt`.
- Persistência testada em schema novo no cluster separado, sem reset, sem apagar recursos e sem criar novos volumes a cada execução. O adapter recebe schema e search_path coerentes, inclusive para SQL bruto.

## Justificativa

Node 24 permite CommonJS consumir os módulos ESM do NestJS 12; TypeScript NodeNext representa esse runtime. A geração cjs explícita remove a ambiguidade do Prisma. Build e execução reais confirmaram a decisão. Índices/constraints protegem integridade mesmo sob concorrência, sem criar serviços de sincronização antecipadamente.

O isolamento por cluster protege desenvolvimento; schemas novos permitem provar migração em destino vazio sem apagar o resultado de testes anteriores. Identificadores dos clusters, nome/porta do banco e inventário são conferidos antes das escritas.

## Consequências

- Rodar geração antes de typecheck/build; artefatos gerados ficam fora do Git. Seeds são explícitos (`prisma db seed`), sem side effects durante instalação/build.
- `firstSeenAt` é protegido no banco; a futura sincronização deve atualizá-lo somente na criação. Status não transitam automaticamente nesta entrega. Validação completa/sanitização de URLs e conteúdo externo pertence aos conectores.
- Tipos e SQL precisam evoluir por migrações versionadas. SQL complementar deve ser revisado e testado; não usar db push/reset como substituto.
- Schemas de teste e recursos antigos continuam consumindo armazenamento. Limpeza depende de inventário e autorização; não faz parte dos scripts atuais.
- PostgreSQL 16 nativo ocupava 5432 no WSL. `.env` local usa projeto `internradar-apps`, portas 15432/15433 e volumes novos; o processo nativo e o container vazio da tentativa em 5432 foram preservados. Compose/digest homologados permanecem intactos.

## Alternativas consideradas

Migrar toda a API para ESM não foi necessário após comprovar cjs no Node 24. O resolver Node16 não representa require(esm) e foi substituído por NodeNext. Mock/SQLite não validariam as constraints PostgreSQL. Reset de banco ou migração de clusters Bookworm colocaria dados existentes em risco. Typecheck sem geração ou saúde estática não comprovariam a integração solicitada.

Referências: [NestJS/Prisma 7](https://docs.nestjs.com/recipes/prisma), [Prisma config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference), [aplicações e testes](../applications.md), [fontes do seed](../seed-sources.md).
