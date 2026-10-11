# Arquitetura do InternRadar

Referência: [especificação v1.0](requirements.md), preservada, e [decisões complementares](requirements-proposed-changes.md).

```mermaid
flowchart LR
  Browser[Navegador] --> Web[apps/web: Next.js — S0-04]
  Web --> API[apps/api: NestJS modular — S0-04]
  API --> DB[(PostgreSQL desenvolvimento)]
  API -. conectores manuais — Sprints 1/2 .-> Sources[Greenhouse / Ashby / Lever]
  Tests[Testes de persistência — S0-05] --> TestDB[(PostgreSQL testes: profile test)]
```

| Camada     | Responsabilidade                                        | Estado                                   |
| ---------- | ------------------------------------------------------- | ---------------------------------------- |
| Raiz       | Workspace, qualidade, infraestrutura e políticas comuns | Implementada                             |
| Web        | Interface e cliente da API InternRadar                  | Manifest; inicialização na S0-04         |
| API        | Configuração, saúde, domínio, conectores e persistência | Manifest; inicialização na S0-04         |
| PostgreSQL | Dois clusters locais com armazenamento separado         | Configurado; homologação S0-03 bloqueada |
| Prisma     | Entidades, migrações e seed idempotente                 | S0-05                                    |
| CI         | Checks reais em PRs                                     | S0-06                                    |

O backend terá fronteiras entre integração externa, normalização, serviços de domínio e persistência. Continuará um único aplicativo; adicionar uma plataforma não deve alterar a listagem pública de vagas. Não há código dessas camadas antecipado neste lote.

## Decisões

- [ADR-001: monorepo e backend modular](decisions/ADR-001-monorepo-e-monolito-modular.md).
- [ADR-002: PostgreSQL e Prisma](decisions/ADR-002-postgresql-prisma.md).
- [ADR-003: APIs públicas](decisions/ADR-003-coleta-por-apis-publicas.md).
- [ADR-006: ambientes](decisions/ADR-006-configuracao-de-ambientes.md).
- [ADR-007: GitHub Flow](decisions/ADR-007-versionamento-e-github-flow.md).

Credenciais ficam na raiz privada; somente valores públicos permitidos chegam ao frontend. Dados externos são não confiáveis. O MVP começa local, com sincronização sob demanda e sem autenticação pública/deploy. Limitações e próximas validações constam no [acompanhamento](sprint-0.md).

A numeração ADR-004/005 permanece reservada aos contratos dos conectores e à política de datas/status previstos na seção 14.4 da especificação; serão documentados nas entregas correspondentes, sem antecipar implementação.
