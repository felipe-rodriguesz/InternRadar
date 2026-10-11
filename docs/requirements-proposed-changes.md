# Alterações propostas à especificação v1.0

O arquivo [requirements.md](requirements.md) é o original preservado. Este registro complementa sua leitura com decisões aprovadas pelo responsável; não publica silenciosamente uma versão 1.1. Uma revisão consolidada deverá ter diff e histórico próprios.

SHA-256 do original: `917610528b367257bc1fe2da1a02ac1527e30e6cd2f52052e45cd95e7414e65e`.

| ID    | Trecho da v1.0            | Decisão aprovada a incorporar                                                                                                 | Implementação/validação                      |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| AC-01 | HU-01, seção 9, TA-01     | `/api/v1/health` canônica e `/health` como alias                                                                              | S0-04                                        |
| AC-02 | HU-02, seção 8.1          | Unicidade global de fontes em `(platform, boardKey, region)`                                                                  | S0-05                                        |
| AC-03 | Contrato 7.1 e seção 8.1  | Região obrigatória, padrão `GLOBAL`                                                                                           | S0-05                                        |
| AC-04 | HU-01/HU-02               | Seed idempotente preserva `enabled` já alterado                                                                               | S0-05                                        |
| AC-05 | Seções 11–13              | Instância de testes independente da instância diária                                                                          | Infra S0-03; testes do produto S0-05         |
| AC-06 | Q-01/Q-02, RNF-003        | pnpm workspaces, Node 24.21.0, pnpm 12.12.0 e strict                                                                          | S0-01                                        |
| AC-07 | Seções 14/15              | GitHub Flow, Issues/Milestone, Conventional Commits, PRs e ADRs; lotes autorizados permitidos                                 | S0-01/S0-02                                  |
| AC-08 | S0-01 e DoD 14.2          | Checks devem acompanhar arquivos reais; typecheck/build/test de aplicações na S0-04, integração Prisma na S0-05 e CI na S0-06 | Distribuição aprovada; sem scripts fictícios |
| AC-09 | Stack e referência Prisma | Manter Prisma major 7; CommonJS condicionado à geração, compilação e execução integrada                                       | S0-05                                        |

S0-04/S0-05 implementaram AC-01/02/03/04/05/09. O alias `/health` redireciona com 307; o endpoint canônico responde JSON e testa PostgreSQL realmente. Fontes verificadas do seed: Figma/Greenhouse e Spotify/Lever; Ashby continua pendente por HTTP 403, conforme [evidências](seed-sources.md). Licença (Q-10) e hospedagem continuam em aberto.

AC-10 — Detalhamento técnico da seção 8, sem novas entidades: UUIDs nativos, timestamptz(3), FKs Restrict, CHECKs para contadores/campos mínimos e trigger de imutabilidade firstSeenAt. [ADR-008](decisions/ADR-008-apps-prisma-runtime.md) registra runtime, saúde e testes; a especificação original permanece intacta.

AC-11 — Detalhamento autorizado S1-03/S1-04/S1-05: CLI é a única via de sincronização; interface inicial de listagem em /jobs, saúde preservada em /. Para o caso legado explicitado na seção 10.2, GET /jobs retorna jobUrl=null quando a URL armazenada falha na validação, permitindo mostrar o anúncio sem link acionável. A descrição é pesquisável, mas omitida da resposta de listagem; detalhe permanece S2-02. [ADR-005](decisions/ADR-005-politica-de-datas-e-status.md) documenta opcionais, contadores, concorrência e RUNNING sem alterar a v1.0.
