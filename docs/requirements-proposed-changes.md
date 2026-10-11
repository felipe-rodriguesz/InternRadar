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

Continuam abertas a seleção de fontes reais do seed, licença (Q-10) e decisões de hospedagem. Não foram escolhidas ou implementadas por suposição neste lote.
