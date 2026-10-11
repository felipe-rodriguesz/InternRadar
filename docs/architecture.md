# Arquitetura do InternRadar

Referência: [especificação v1.0](requirements.md), preservada, e [decisões complementares](requirements-proposed-changes.md).

```mermaid
flowchart LR
  Browser[Navegador] -->|Página e JavaScript| Web[apps/web: Next.js]
  Browser -->|React consulta saúde e vagas| API[apps/api: NestJS modular]
  API --> Prisma[Prisma + adapter-pg]
  Prisma --> DB[(PostgreSQL desenvolvimento)]
  API --> Connectors[ConnectorsModule: Greenhouse]
  Connectors --> Sources[API pública Greenhouse]
  CLI[CLI local] --> Sync[SyncModule / SyncService]
  Sync --> Connectors
  Sync --> Prisma
  API --> Jobs[JobsModule: filtros e paginação]
  Jobs --> Prisma
  API -. próximos adapters .-> Future[Ashby / Lever]
  Tests[Testes de persistência] --> TestDB[(PostgreSQL testes: profile test)]
```

| Camada     | Responsabilidade                                        | Estado                 |
| ---------- | ------------------------------------------------------- | ---------------------- |
| Raiz       | Workspace, qualidade, infraestrutura e políticas comuns | Implementada           |
| Web        | Interface e cliente da API InternRadar                  | Aplicação executável   |
| API        | Configuração, saúde, domínio, conectores e persistência | Aplicação executável   |
| PostgreSQL | Dois clusters locais com armazenamento separado         | Homologado na S0-03    |
| Prisma     | Entidades, migrações e seed idempotente                 | Implementado e testado |
| CI         | Checks reais em PRs                                     | Workflow em PRs        |

O backend terá fronteiras entre integração externa, normalização, serviços de domínio e persistência. Continuará um único aplicativo; adicionar uma plataforma não deve alterar a listagem pública de vagas. Saúde, configuração e persistência estão implementadas. ConnectorsModule exporta o adapter Greenhouse; transporte/normalização não acessam Prisma. SyncModule orquestra coleta e gravação pelo CLI, fora do servidor HTTP. JobsModule consulta dados persistidos, independente do conector. Outros adapters ficam para S2-01.

## Decisões

- [ADR-001: monorepo e backend modular](decisions/ADR-001-monorepo-e-monolito-modular.md).
- [ADR-002: PostgreSQL e Prisma](decisions/ADR-002-postgresql-prisma.md).
- [ADR-003: APIs públicas](decisions/ADR-003-coleta-por-apis-publicas.md).
- [ADR-004: contratos dos conectores](decisions/ADR-004-contrato-dos-conectores.md).
- [ADR-005: datas, status e consistência](decisions/ADR-005-politica-de-datas-e-status.md).
- [ADR-006: ambientes](decisions/ADR-006-configuracao-de-ambientes.md).
- [ADR-007: GitHub Flow](decisions/ADR-007-versionamento-e-github-flow.md).
- [ADR-008: aplicações e runtime Prisma](decisions/ADR-008-apps-prisma-runtime.md).

Credenciais ficam na raiz privada; somente valores públicos permitidos chegam ao frontend. Dados externos são não confiáveis. O MVP começa local, com sincronização sob demanda e sem autenticação pública/deploy. Limitações e próximas validações constam no [acompanhamento](sprint-0.md).

ADR-004 registra o contrato implementado. ADR-005 consolida datas/status, transações e execuções incompletas. [Conectores](connectors.md) e [CI](ci.md) descrevem operação e testes.

O fluxo real de saúde e os comandos estão em [applications.md](applications.md). Company → JobSource → Job/SyncRun foi implementado por migração; GET /api/v1/jobs é o primeiro endpoint de consulta de negócio. [Sincronização e API](synchronization.md) detalha o fluxo completo.
