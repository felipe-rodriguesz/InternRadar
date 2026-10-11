# ADR-006 — Configuração de ambientes locais

Status: aceito. Referências: HU-01/12; RNF-001/005/006/017.

## Contexto

O projeto deve funcionar no WSL2 com Docker Desktop, mantendo credenciais privadas e bancos de desenvolvimento/testes separados.

## Decisão

Usar `.env` privado na raiz para `POSTGRES_*`, `POSTGRES_TEST_*` e configurações da API/Prisma. O frontend terá `apps/web/.env.local`, contendo apenas valores públicos necessários. Modelos `.env.example` serão versionados, com placeholders. A API carregará explicitamente o ambiente da raiz na S0-04 e os comandos Prisma na S0-05.

## Justificativa

Uma origem privada evita duplicar senhas. Prefixos `NEXT_PUBLIC_` são reservados a dados que podem chegar ao navegador. Serviços PostgreSQL separados evitam compartilhar cluster, rede ou volume entre ambientes.

## Consequências

- Portas do PostgreSQL são publicadas apenas em `127.0.0.1`; padrão 5432/5433, configurável.
- Profile `test` evita iniciar o banco de testes no fluxo normal de desenvolvimento.
- Compose rejeita variáveis obrigatórias vazias; PostgreSQL usa autenticação SCRAM para TCP.
- Alterar portas/credenciais exige atualizar a URL privada coerentemente; exemplos não são senhas de uso real.
- `db:verify` gera credenciais, portas e projeto Docker temporários próprios; confirma sua propriedade, para os containers e preserva os volumes. Uma remoção posterior depende de revisão do impacto e autorização.
- TEST_DATABASE_URL e conexão Prisma foram implementados na S0-05; testes verificam cluster separado antes de criar schemas.

## Alternativas consideradas

Senhas no Compose/repositório violariam RNF-006. Duplicar `.env` da API geraria divergência. Publicar portas em todas as interfaces ampliaria a exposição. Reutilizar o banco diário nos testes comprometeria o isolamento.

Procedimento de operação: [banco local](../database.md). Aplicativos, variáveis e testes: [execução](../applications.md).
