# Sprint 1 — Primeiro conector vertical

Referência: especificação v1.0, seção 13.2. [Milestone](https://github.com/felipe-rodriguesz/InternRadar/milestone/2). Lote autorizado inclui S0-06/S1-01/S1-02; branch feat/s0-06-s1-01-02-ci-greenhouse.

| Entrega | Issue                                                             | Estado                                                  |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| S1-01   | [#10](https://github.com/felipe-rodriguesz/InternRadar/issues/10) | Contratos, normalização e testes implementados          |
| S1-02   | [#11](https://github.com/felipe-rodriguesz/InternRadar/issues/11) | Greenhouse implementado; consulta Figma real aprovada   |
| S1-03   | A criar no próximo lote                                           | SyncRun, transações/upsert, contadores e logs por fonte |
| S1-04   | A criar no próximo lote                                           | GET /jobs, filtros, ordenação e paginação               |
| S1-05   | A criar no próximo lote                                           | Interface de listagem e estados reais                   |

## Evidências do lote — 11/10/2026

PR #8 integrado por rebase após conferir HEAD 73c98ca57f07c0b6204b2b2e253d7a5871073ab6, árvore limpa e ausência de conflitos/checks com falha. Main sincronizada em 200298c8b0409eb019579665f06f8f4dacf76b36; Issues #6/#7 fechadas automaticamente. Branches antigas preservadas.

35 testes unitários aprovados inicialmente (2 ambiente, 5 normalização compartilhada e 28 Greenhouse): fixtures, erros, redirects, retries/Retry-After, timeout por sinal abortado e limite de corpo. Dependências htmlparser2 12.0.0 / entities 8.1.0 verificadas e fixadas no pacote API; Node/pnpm/TypeScript/Prisma/PostgreSQL preservados. Lint, instalação congelada com peers estritos, typecheck e builds aprovados.

Consulta real `pnpm greenhouse:check figma`: 150 anúncios recebidos/aceitos, zero rejeições/avisos, uma tentativa às 07:15:41 UTC; nada persistido, sem inferir publicação/modalidade. [Contrato, limites e evidências](connectors.md). Testes de CI não fazem essa chamada externa.

Regressão local: `pnpm test` aprovou os 35 unitários, 2 HTTP e 8 testes Playwright. `pnpm test:integration` aprovou 8 testes reais no schema novo `check_590f6fec96f84410b48d8604c0af0ac1`, preservado no cluster separado. Inventário Docker idêntico ao início do lote (8 containers, 7 volumes, 12 redes), sem novos erros de I/O. Nenhum dado anterior removido.

Revisão de 98 arquivos candidatos: especificação idêntica ao original por bytes/SHA-256, Compose/digest/schema/strict base preservados, nenhuma credencial local ou padrão de chave/token encontrado. JSON/YAML/LF, configuração de CI, workspaces e whitespace aprovados.

A configuração de CI está implementada; homologação remota ainda depende da publicação e execução do workflow. Resultados finais de regressão e CI serão acrescentados após execução, sem tratar configuração como teste aprovado.

## Pendências deliberadas

S1-03 deve consumir CollectionResult, respeitar enabled, registrar SyncRun e upsert transacional, preservando firstSeenAt e dados em falhas. Não há endpoint administrativo neste lote. Concorrência/paginação compartilhada serão introduzidas quando houver uso real.

S1-04/S1-05 ainda não foram implementadas. Ashby/Lever e verificação de board Ashby continuam para S2-01; HTTP 403 anterior permanece documentado. A política completa de datas/status (ADR-005) será consolidada junto da sincronização, sem transições por desaparecimento antecipadas.
