# Integração contínua

Workflow: [.github/workflows/ci.yml](../.github/workflows/ci.yml). Rastreabilidade: [S0-06 / Issue #9](https://github.com/felipe-rodriguesz/InternRadar/issues/9), HU-01/HU-12, RNF-015, TA-01/TA-12. O resultado remoto deve ser conferido nos Checks do PR; YAML válido sozinho não comprova homologação.

## Execução

Um job `Quality and integration` em ubuntu-24.04, timeout de 25 minutos. Executa em PRs para main, pushes na main e disparo manual. Novas execuções da mesma branch/PR cancelam a anterior; não há push de feature branch duplicando a execução do PR.

1. Checkout sem persistir credenciais; Node da .nvmrc e pnpm do packageManager.
2. Instalação congelada com peers estritos e geração Prisma.
3. Lint, Prettier, strict e builds dos dois aplicativos.
4. Testes unitários/contratos offline.
5. Migração e seed no banco efêmero da aplicação.
6. Testes HTTP reais e persistência em outro cluster PostgreSQL.
7. Instalação Chromium/Firefox e bibliotecas somente no runner; Playwright inicia API/web compiladas, espera saúde e encerra os processos próprios.
8. Descoberta dos workspaces, ausência de alterações rastreadas e SHA-256 da especificação.

Não são feitos builds duplicados para os browsers. Geração Prisma nos scripts de typecheck/build permanece para permitir execução independente desses comandos. O cache armazena somente o store pnpm, com chave do lockfile; não inclui .env, banco, node_modules, builds ou traces. Browsers não têm cache separado para evitar complexidade sem medição de benefício.

## Bancos e segurança

Dois service containers oficiais PostgreSQL 17.11 Trixie, com o mesmo digest homologado do Compose. Portas loopback 15432/15433 no runner, bancos/usuários distintos e healthchecks. O teste de persistência compara system_identifier dos clusters antes de criar seu schema; nome/porta de TEST_DATABASE_URL precisam corresponder às variáveis POSTGRES_TEST_*.

São recursos descartáveis **do GitHub-hosted runner**, sem conexão com o Docker do computador do desenvolvedor. GitHub encerra serviços na finalização do job, inclusive em falhas. Não há comandos de limpeza de volumes/schemas locais.

Apenas nesses containers efêmeros de CI, POSTGRES_HOST_AUTH_METHOD=trust evita provisionar/exibir senhas. As URLs usam `ci-unused` como placeholder sintático, não como segredo. Portas estão restritas a loopback, nenhum segredo do usuário é disponibilizado e o runner é descartado. Essa configuração **não deve ser copiada para ambiente persistente, self-hosted ou público**; o Compose local mantém SCRAM e permanece inalterado.

Permissões do GITHUB_TOKEN: somente contents:read. Sem pull_request_target, publicação de pacotes, deploy ou auto-merge. Actions fixadas por SHA de releases oficiais: checkout v7.0.1, setup-node v7.1.0 e pnpm/action-setup v6.1.0. Scripts de dependências continuam sujeitos ao allowBuilds do workspace.

Não são publicados dumps, ambientes ou traces como artefatos. Logs dos testes apresentam diagnósticos controlados; conectores não acessam fontes externas no CI. Aplicações usam URLs locais; somente a URL pública da API é incorporada à web.

## Reproduzir e diagnosticar

No checkout local, prepare bancos/ambiente/migrações conforme README; não copie as URLs da CI sobre seu .env. Execute:

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm prisma:generate
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm test:integration
```

No GitHub, abra o check do PR ou use `gh run list --branch <branch>` e `gh run view <id> --log-failed`. Investigue o primeiro passo com erro, corrija e publique um commit normal; não use continue-on-error ou retries globais para esconder falhas. Os testes Playwright têm zero retries.

A configuração não torna checks obrigatórios nem modifica proteção da main. Homologação inicial aprovada no [run 38121178306](https://github.com/felipe-rodriguesz/InternRadar/actions/runs/38121178306): todos os passos concluídos, incluindo 53 testes e finalização dos serviços. O último HEAD deve ter seu próprio check aprovado no [PR #12](https://github.com/felipe-rodriguesz/InternRadar/pull/12); a Issue #9 registra a execução mais recente.

Referências: [services PostgreSQL](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers), [setup-node](https://github.com/actions/setup-node), [pnpm/action-setup](https://github.com/pnpm/action-setup).
