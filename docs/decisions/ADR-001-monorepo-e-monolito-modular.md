# ADR-001 — Monorepo e backend modular

Status: aceito. Referências: seção 2 da especificação; RF-001; RNF-002/003/019.

## Contexto

Um desenvolvedor precisa evoluir interface, API e contratos em incrementos revisáveis, com ferramentas comuns e responsabilidades claras.

## Decisão

Manter `apps/web` (Next.js/React) e `apps/api` (NestJS) em pnpm workspaces, com lockfile único e ferramentas de qualidade na raiz. O backend será um monólito modular: um processo, com módulos por responsabilidade e dependências explícitas. O frontend acessará somente a API do InternRadar.

## Justificativa

Mudanças relacionadas podem ser revisadas no mesmo PR. Separar aplicativos evita misturar acesso a dados com interface, e módulos permitem testar regras sem administrar múltiplos serviços.

## Consequências

- Cada aplicativo declara suas dependências e terá scripts próprios na S0-04.
- TypeScript strict é compartilhado; opções de build/módulos são específicas dos aplicativos.
- Pacotes compartilhados só serão criados quando existir necessidade concreta.
- Conectores, normalização e persistência serão separados dentro da API nas sprints correspondentes.
- Atualizações do lockfile exigem conferir o impacto nos dois aplicativos.

## Alternativas consideradas

Repositórios separados aumentariam a coordenação de contratos. Microsserviços acrescentariam operação, comunicação e deploy sem necessidade do MVP. Uma aplicação única com lógica de coleta no frontend contrariaria RNF-002.

Implementado: workspace. Pendente: aplicativos/módulos na S0-04 e conectores nas sprints seguintes.
