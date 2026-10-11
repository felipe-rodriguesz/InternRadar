# Sprint 0 — Project Foundation

## Referência e controle

- Especificação: [requirements.md](requirements.md), versão 1.0, preservada integralmente.
- Repositório oficial: <https://github.com/felipe-rodriguesz/InternRadar>.
- Branch S0-01: `chore/s0-01-foundation-tooling`, criada a partir da `main` limpa e sincronizada no commit `83543026f2e99ec25e11e902705ed2d801c4451d`.
- Issue: [#1 — Configure repository and development tooling](https://github.com/felipe-rodriguesz/InternRadar/issues/1).
- Milestone: [Sprint 0 — Project Foundation](https://github.com/felipe-rodriguesz/InternRadar/milestone/1).
- S0-01 integrada por rebase no [PR #2](https://github.com/felipe-rodriguesz/InternRadar/pull/2), em `acaff60f8bb4aacc703fad89886b033807b0588c`; Issue #1 fechada.
- Lote autorizado S0-02/S0-03: branch `chore/s0-02-03-docs-postgresql`, derivada dessa main após `git pull --ff-only`. Issues [#3](https://github.com/felipe-rodriguesz/InternRadar/issues/3) e [#4](https://github.com/felipe-rodriguesz/InternRadar/issues/4), no mesmo Milestone.
- S0-02/S0-03 integradas por rebase no [PR #5](https://github.com/felipe-rodriguesz/InternRadar/pull/5), em `2507b8ccfea3da388dea67e16a1e99677624d094`, após autorização e conferência do HEAD `ba3e6c5b7f05a865a0ebee0981f7616200360a0b`. Três commits preservados; Issues #3/#4 fechadas automaticamente. Os registros das falhas anteriores abaixo são históricos.
- Lote S0-04/S0-05: branch `feat/s0-04-05-apps-prisma`, Issues #6/#7. Aplicações e persistência implementadas; resultados e pendência de verificação Ashby registrados ao final. S0-06 ainda não iniciada.

## Distribuição das validações aprovada

Nesta entrega, o responsável definiu a seguinte distribuição, substituindo a proposta anterior de uma prova isolada de tecnologias na S0-01a:

| Etapa  | Responsabilidade                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------- |
| S0-01a | Verificar ambiente, versões e requisitos documentados das tecnologias                                    |
| S0-01b | Configurar e validar descoberta de pacotes, lockfile e configurações centrais do monorepo                |
| S0-01c | Validar ignores, arquivos versionáveis, atributos de finais de linha e exemplos de ambiente sem segredos |
| S0-01d | Instalar ferramentas compartilhadas, validar configs e executar lint/formatação dos arquivos existentes  |
| S0-04  | Inicializar Next.js/NestJS e comprovar checagem de tipos, build e execução dos aplicativos reais         |
| S0-05  | Comprovar geração, compilação e execução integrada de Prisma 7 com NestJS/PostgreSQL, migrações e seed   |

Não foram criadas aplicações artificiais para provas de compatibilidade. As pendências abaixo não representam testes já executados. A especificação 1.0 não foi revisada; ajustes futuros serão registrados separadamente na S0-02 e versionados.

## S0-01a — Ambiente e requisitos documentados

Verificações de ambiente concluídas em 10/10/2026:

| Item       | Evidência                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Workspace  | `/home/felipe/projects/InternRadar`, com leitura/escrita autorizadas                              |
| Git        | `main` limpa antes da criação da branch; HEAD local igual à `main` consultada por `git ls-remote` |
| Rede       | GitHub e registry npm com DNS funcional e HTTPS 200                                               |
| GitHub CLI | Autenticado como `felipe-rodriguesz`; API e repositório acessíveis                                |
| Docker     | Servidor 29.8.2 acessível por `docker version`, `docker info` e `docker ps`                       |

| Ferramenta disponível | Versão  |
| --------------------- | ------- |
| Node.js               | 24.21.0 |
| npm                   | 11.19.0 |
| Corepack              | 0.36.0  |
| pnpm                  | 12.12.0 |
| Git                   | 2.43.0  |
| Docker Engine         | 29.8.2  |
| Docker Compose        | 5.5.1   |
| GitHub CLI            | 2.101.0 |

Versões de referência consultadas no registry npm em 10/10/2026, **sem instalação ou inclusão nos manifests de aplicações**:

| Tecnologia                                                                                                                                                                               | Versão consultada | Requisito documentado relevante                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| [Next.js](https://registry.npmjs.org/next/16.4.0)                                                                                                                                        | 16.4.0            | Node >=20.9; peer React/React DOM inclui a linha 19                                        |
| [React](https://registry.npmjs.org/react/19.3.0) / [React DOM](https://registry.npmjs.org/react-dom/19.3.0)                                                                              | 19.3.0            | React DOM declara peer React ^19.3.0                                                       |
| [NestJS core](https://registry.npmjs.org/@nestjs/core/12.1.2)                                                                                                                            | 12.1.2            | Engine Node >=20; peers Nest na major 12, RxJS ^7.1.0 e reflect-metadata ^0.1.12 ou ^0.2.0 |
| [NestJS CLI](https://registry.npmjs.org/@nestjs/cli/12.0.8)                                                                                                                              | 12.0.8            | Engine Node >=20.11; os geradores têm requisito adicional                                  |
| [NestJS schematics](https://registry.npmjs.org/@nestjs/schematics/12.0.6)                                                                                                                | 12.0.6            | Node ^22.22.3, ^24.15.0 ou >=26; peer TypeScript >=6                                       |
| [TypeScript](https://registry.npmjs.org/typescript/7.0.2)                                                                                                                                | 7.0.2             | Engine Node >=16.20                                                                        |
| [Tailwind CSS](https://registry.npmjs.org/tailwindcss/4.3.3)                                                                                                                             | 4.3.3             | O pacote consultado não declara engine Node; integração e ferramentas na S0-04             |
| [Prisma CLI](https://registry.npmjs.org/prisma/7.10.0) / [client](https://registry.npmjs.org/@prisma/client/7.10.0) / [adapter-pg](https://registry.npmjs.org/@prisma/adapter-pg/7.10.0) | 7.10.0            | CLI/client declaram Node ^20.19, ^22.12 ou >=24 e peer TypeScript >=5.4                    |
| [pg](https://registry.npmjs.org/pg/8.23.1)                                                                                                                                               | 8.23.1            | Engine Node >=16                                                                           |

As versões consultadas satisfazem os requisitos de Node 24.21.0 apresentados acima. Isso valida os requisitos documentados, não a execução conjunta. A matriz completa de dependências, peers e versões transitivas será verificada ao introduzir cada tecnologia e registrada nos manifests e no lockfile. Prisma permanece na major 7 conforme aprovação; as outras versões desta tabela são referências consultadas, não versões já fixadas no projeto.

Referências adicionais:

- [Next.js: requisitos de instalação](https://nextjs.org/docs/app/getting-started/installation).
- [NestJS 12: requisitos de Node e módulos](https://docs.nestjs.com/migration-guide): aplicações CommonJS dependem do suporte `require(esm)` do Node; Node 24.21.0 também supera o mínimo 24.15 dos geradores e 24.9 indicado para Jest com os pacotes ESM.
- [Prisma 7: requisitos](https://www.prisma.io/docs/orm/v7/reference/system-requirements): Node 24 e TypeScript >=5.4 documentados; bibliotecas de sistema e integração real serão conferidas na S0-05.

PostgreSQL e sua imagem serão definidos na S0-03. A escolha CommonJS da API permanece condicionada à comprovação integrada na S0-05; a base TypeScript deste incremento não fixa formato de módulos.

## Integridade da especificação

Origem preservada: `/mnt/c/Users/felip/Downloads/InternRadar/docs/requirements.md`.

Destino: `docs/requirements.md` neste checkout. O destino estava ausente; a cópia foi criada sem sobrescrever arquivos. Comparação de bytes e SHA-256 confirmaram igualdade, inclusive após as verificações do workspace.

- Tamanho: 58.355 bytes.
- Linhas: 949.
- SHA-256 do original e da cópia:

```text
917610528b367257bc1fe2da1a02ac1527e30e6cd2f52052e45cd95e7414e65e
```

## S0-01b — Escopo e critérios

Objetivo: estabelecer pnpm workspaces para frontend/API, preservando o histórico existente e preparando a evolução incremental.

Referências: seção 13.1/S0-01; RF-001; HU-01/HU-12; RNF-001, RNF-003 e RNF-016. RNF-015/TA-12 terão seus scripts e execução de aplicações completados nas etapas indicadas abaixo. O aceite completo de RF-001/HU-01/TA-01 depende das aplicações e do banco.

- [x] Conferir `main` limpa e sincronizada antes das modificações.
- [x] Criar e confirmar a branch de trabalho a partir da `main` existente.
- [x] Incorporar a especificação oficial com integridade comprovada.
- [x] Registrar Node 24.21.0 e pnpm 12.12.0 na configuração do projeto.
- [x] Reconhecer `@internradar/web` e `@internradar/api` como pacotes privados separados.
- [x] Gerar um único `pnpm-lock.yaml` na raiz e instalar com `--frozen-lockfile`.
- [x] Preparar a base TypeScript strict e sua herança em ambos os aplicativos.
- [x] Disponibilizar apenas o script pertinente `workspace:list` e documentar comandos com filtros.
- [x] Documentar responsabilidades, verificações e pendências sem atribuir sucesso a testes futuros.
- [x] Preservar `main` e não executar commits ou alterações remotas.

Nenhuma dependência de aplicação ou ferramenta de lint/testes foi adicionada. O pnpm 12 registra também metadados do gerenciador no lockfile; os importers da raiz e dos dois aplicativos não contêm dependências de aplicação. O lockfile é gerado pelo pnpm e deve ser mantido por ele.

## Verificações executadas na S0-01b

| Comando/verificação                                                                                                | Resultado                                                       |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `git status --short --branch`, `git rev-parse HEAD main origin/main` e `git ls-remote origin HEAD refs/heads/main` | `main` limpa e hashes coincidentes antes das modificações       |
| `git switch -c chore/s0-01-foundation-tooling` e `git branch --show-current`                                       | Branch criada e selecionada                                     |
| Cópia exclusiva com Python, comparação de bytes e SHA-256                                                          | Original preservado e destino idêntico                          |
| `pnpm install --lockfile-only`                                                                                     | Lockfile gerado para os três projetos                           |
| `pnpm install --frozen-lockfile`                                                                                   | Instalação concluída sem alteração necessária no lockfile       |
| `pnpm workspace:list`                                                                                              | Raiz, web e api reconhecidos                                    |
| `pnpm --filter @internradar/web --fail-if-no-match exec node -p "process.cwd()"`                                   | Selecionou `apps/web`                                           |
| `pnpm --filter @internradar/api --fail-if-no-match exec node -p "process.cwd()"`                                   | Selecionou `apps/api`                                           |
| Leitura dos seis JSONs e resolução dos caminhos `extends`                                                          | Sintaxe válida; ambos herdam a base com `strict: true`          |
| Comparação de `.nvmrc`, `engines` e `packageManager`                                                               | Versões centrais consistentes                                   |
| `pnpm config get engineStrict`, `pmOnFail`, `savePrefix` e `sharedWorkspaceLockfile`                               | Valores efetivos `true`, `error`, prefixo vazio e `true`        |
| `git check-ignore` com caminhos de `node_modules` na raiz e nos apps                                               | Dependências locais ignoradas                                   |
| `git diff --check`                                                                                                 | Sem erros no diff de arquivos já rastreados                     |
| `git rev-parse main HEAD`                                                                                          | `main` e HEAD continuam no commit inicial; nenhum commit criado |

Estas verificações validam a configuração do workspace. Não houve compilação TypeScript, build, execução de aplicativos, testes de banco ou CI. Os comandos foram executados no Ubuntu/WSL; execução pelo PowerShell ainda não foi demonstrada.

## S0-01c — Arquivos ignorados, finais de linha e ambiente

Objetivo: manter configurações locais e artefatos fora do versionamento, padronizar a edição entre Windows/WSL2/Linux e preparar exemplos de ambiente mínimos. Referências: seção 13.1/S0-01; HU-01/HU-12; RNF-001, RNF-006 e RNF-016.

Arquivos deste incremento:

- Modificados: `.gitignore`, `README.md` e este acompanhamento.
- Criados: `.gitattributes`, `.editorconfig`, `.env.example` e `apps/web/.env.example`.

Decisões:

- `.env` e `.env.*` são ignorados em qualquer pacote, com exceção apenas de `.env.example`.
- Dependências, store pnpm, builds, caches, cobertura, temporários e cliente Prisma gerado são ignorados. As regras de diretórios de build/cache ficam limitadas à raiz e aos aplicativos para não esconder documentos/fontes em outros locais.
- Lockfile, fontes, documentos, schema, seed e migrações Prisma permanecem elegíveis para versionamento. Como ainda não houve staging/commit da fundação, os novos arquivos continuam não rastreados; elegibilidade não significa que já tenham sido adicionados ao histórico.
- `.gitattributes` usa detecção automática de texto/binário e LF; somente scripts `.bat`/`.cmd` usam CRLF no checkout. Não houve `git add --renormalize` ou configuração global.
- `.editorconfig` orienta UTF-8, dois espaços, newline final e finais de linha coerentes. Espaços ao fim de linhas Markdown são preservados.
- O exemplo da raiz separa `POSTGRES_*` de `API_HOST`, `API_PORT` e `DATABASE_URL` privados. O exemplo de web contém somente `NEXT_PUBLIC_API_BASE_URL`. A API usará o ambiente privado da raiz conforme o planejamento, sem duplicar credenciais em `apps/api`.
- As oito variáveis dos exemplos preparam apenas banco, endereço/porta da API e acesso público à API. A senha é o placeholder `CHANGE_ME_LOCAL_ONLY`; os demais valores são configurações de loopback. Não foram criados arquivos `.env` locais, serviços ou carregadores de ambiente.

Critérios de aceite:

- [x] Ignorar ambientes locais/segredos e manter `.env.example` elegível para versionamento.
- [x] Ignorar dependências, builds, caches e temporários sem esconder fontes/documentos importantes.
- [x] Preservar elegibilidade do lockfile e das futuras migrações.
- [x] Configurar finais de linha coerentes com Windows/WSL2/Linux sem reescrever arquivos existentes.
- [x] Preparar exemplos mínimos, separar valores públicos/privados e documentar cópia sem sobrescrita.
- [x] Validar sintaxe, padrões, integridade da especificação e ausência de credenciais reais nos exemplos.
- [x] Manter a branch de trabalho, `main`, histórico e index; não executar alterações remotas.

Verificações executadas:

| Comando/verificação                                                                           | Evidência                                                                                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `git check-ignore --no-index --non-matching --verbose -z --stdin` com matriz de caminhos      | 40 casos ignorados e 33 casos preservados; todos passaram                                                                  |
| `git check-attr -z --stdin text eol`                                                          | 9 caminhos confirmaram LF padrão e CRLF para `.bat`/`.cmd`                                                                 |
| `git -c core.autocrlf=<false/true/input> hash-object --path=<caminho> --stdin`, sem `-w`      | 9 combinações converteram entrada CRLF para o mesmo hash LF; nenhum objeto/arquivo gravado                                 |
| `git hash-object --path=docs/reference.pdf --stdin` com bytes binários simulados              | Hash igual ao conteúdo bruto; detecção automática preservou bytes                                                          |
| Leitura de `.editorconfig` com parser INI e validação de propriedades                         | Sintaxe válida; exceções Markdown/Windows coerentes com os atributos                                                       |
| `bash -n .env.example` e `bash -n apps/web/.env.example`, mais validação das atribuições/URLs | Sintaxe válida, sem chaves duplicadas; URL do banco coerente com `POSTGRES_*` e URL pública coerente com host/porta da API |
| Verificação dos valores preparados                                                            | Senha somente placeholder; nenhuma credencial, query ou token na variável pública                                          |
| `git ls-files --cached --others --exclude-standard --eol` e leitura dos bytes                 | Todos os 17 arquivos atuais em UTF-8/LF, com newline final                                                                 |
| Comparação de bytes e SHA-256 de `docs/requirements.md` com o original                        | Igualdade preservada; hash registrado acima                                                                                |
| `git diff --check` e inspeção de whitespace dos arquivos novos                                | Sem erros nas configurações/documentação editadas; especificação preservada sem reformatação                               |
| `uname -r`                                                                                    | Kernel WSL2 `6.6.87.2-microsoft-standard-WSL2`; LF adequado às ferramentas Linux                                           |
| `git branch --show-current`, `git rev-parse main HEAD` e `git diff --cached --stat`           | Branch correta; refs no commit inicial e index sem alterações                                                              |

As verificações foram executadas no Ubuntu/WSL2. O comportamento de normalização foi testado com overrides de Git por comando, sem mudanças locais/globais. Não houve teste de checkout real no Windows ou execução de um editor; a implementação dos carregadores e a execução dos serviços continuam nas S0-03/S0-04/S0-05.

S0-01c-P01 concluída naquele incremento. As ferramentas compartilhadas foram posteriormente preparadas na S0-01d, registrada abaixo; a integração específica dos aplicativos permanece na S0-04.

## S0-01d — Ferramentas de qualidade e scripts compartilhados

Objetivo: instalar ferramentas locais reproduzíveis e executar verificações reais sobre os arquivos existentes, preparando as políticas comuns para a inicialização dos aplicativos. Referências: seção 13.1/S0-01; HU-12; RNF-003, RNF-015 e RNF-016. O aceite completo de TA-12 depende das aplicações e da CI.

Arquivos deste incremento:

- Criados: `eslint.config.mjs`, `.prettierrc.json` e `.prettierignore`.
- Modificados: `package.json`, `pnpm-lock.yaml`, `README.md` e este acompanhamento.
- Preservados: especificação, configurações TypeScript, manifests dos aplicativos e demais configurações já aprovadas.

Dependências de desenvolvimento da raiz, fixadas em versões exatas após consultas de engines/peers no registry em 11/10/2026:

| Dependência              | Versão | Requisito relevante / papel                                             |
| ------------------------ | ------ | ----------------------------------------------------------------------- |
| `eslint`                 | 9.39.5 | Node ^18.18, ^20.9 ou >=21.1; análise estática                          |
| `@eslint/js`             | 9.39.5 | Mesmo requisito de Node; regras recomendadas JavaScript                 |
| `@eslint/compat`         | 2.1.1  | Node ^20.19, ^22.13 ou >=24; importação dos ignores do Git              |
| `typescript-eslint`      | 8.71.1 | ESLint ^8.57/^9/^10 e TypeScript >=4.8.4 <6.1; parser/regras TypeScript |
| `typescript`             | 6.0.3  | Node >=14.17; compilador e API de validação de configurações            |
| `prettier`               | 3.9.9  | Node >=14; formatação                                                   |
| `eslint-config-prettier` | 10.1.8 | ESLint >=7; desativa regras de estilo conflitantes                      |

Todas atendem ao Node 24.21.0. O pnpm resolveu 112 pacotes de ferramentas; nenhum pacote de aplicação foi instalado.

Decisões e compatibilidade:

- ESLint 10 e TypeScript 7 não foram selecionados: os plugins React/import/acessibilidade consultados para `eslint-config-next` 16.4.0 ainda limitam ESLint à major 9, e typescript-eslint 8.71.1 suporta TypeScript abaixo de 6.1. TypeScript 6.0.3 também atende ao peer >=6 dos geradores NestJS 12.0.6.
- O registry emite aviso deprecated para ESLint 9.39.5. A escolha mantém a interseção de compatibilidade documentada; a atualização será reavaliada na S0-04 com os plugins/frameworks reais. A consulta não comprova execução integrada de Next.js/NestJS.
- Prettier 3.9.9 foi selecionado para manter a política de idade de pacotes existente. A tentativa inicial com 3.9.10 acrescentou uma exceção automática do pnpm; ela foi removida e a configuração `pnpm-workspace.yaml` foi preservada.
- O ESLint usa flat config compartilhada e importa `.gitignore` via compat, sem duplicar os padrões de artefatos. Regras recomendadas JS/TS são comuns; integrações de React/Next.js, ambientes e informações de tipos ficam na S0-04. O preset Prettier é aplicado por último.
- Prettier utiliza LF, aspas simples, ponto e vírgula, trailing commas, largura de referência 100 e preservação de quebras de parágrafos. O EditorConfig existente complementa a política.
- A especificação e o lockfile estão excluídos tanto da escrita quanto da checagem do Prettier. A atualização do lockfile foi feita somente pelo pnpm para registrar as ferramentas instaladas; não houve edição manual ou formatação desse arquivo.
- Foram formatados apenas arquivos indicados e pertinentes deste incremento, incluindo os dois documentos já atualizados. Não houve escrita em massa ou mudança nos tsconfigs/manifests dos aplicativos.

Scripts implementados:

| Script           | Comando                            | Verificação atual                                                      |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `format`         | `prettier --write`                 | Recebe caminhos explícitos; sem argumentos não faz formatação em massa |
| `format:check`   | `prettier --check .`               | Verifica formatos suportados do workspace, respeitando exceções        |
| `lint`           | `eslint . --max-warnings 0`        | Analisa o código existente; atualmente `eslint.config.mjs`             |
| `workspace:list` | `pnpm list --recursive --depth -1` | Mantido; lista raiz, web e api                                         |

Não há scripts `typecheck`, `build` ou `test`: os aplicativos ainda não possuem fontes nem ferramentas específicas. Não foram criadas aplicações ou scripts fictícios para simular sucesso. O TypeScript instalado validou configurações com sua API; isso é distinto de checar tipos de código.

Verificações executadas:

| Comando/verificação                                                                                                                                      | Evidência                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Consultas de engines/peers e instalação com `pnpm add --workspace-root --save-dev --save-exact --strict-peer-dependencies`                               | Sete versões diretas exatas; nenhuma incompatibilidade de peers                                                                      |
| `pnpm install --frozen-lockfile --strict-peer-dependencies`                                                                                              | Instalação concluída com lockfile consistente                                                                                        |
| Instalação em diretório temporário vazio, com cópias dos manifests/YAML/lockfile e `pnpm install --frozen-lockfile --offline --strict-peer-dependencies` | 112 pacotes reproduzidos do cache, sem novo repositório; lockfiles temporário/original inalterados                                   |
| `pnpm list --depth 0` e leitura dos manifests instalados                                                                                                 | Sete dependências locais correspondem às versões declaradas                                                                          |
| Executáveis locais ESLint/Prettier/TypeScript                                                                                                            | 9.39.5 / 3.9.9 / 6.0.3 confirmados, inclusive na instalação limpa                                                                    |
| `pnpm lint` e API ESLint `lintFiles`/`calculateConfigForFile`                                                                                            | Um arquivo real analisado; sem erros/avisos; regra de variáveis não utilizadas ativa e estilo delegado ao Prettier                   |
| API ESLint `lintText` com entrada inválida em memória                                                                                                    | Regra `no-undef` detectou o erro; não houve implementação de aplicação de teste                                                      |
| `pnpm format eslint.config.mjs .prettierrc.json README.md docs/sprint-0.md` e `pnpm format:check`                                                        | Formatação direcionada e verificação do workspace aprovadas                                                                          |
| API Prettier `getFileInfo` com os ignores                                                                                                                | Especificação e lockfile confirmados como ignorados pelo formatter                                                                   |
| API TypeScript `getParsedCommandLineOfConfigFile` para os três tsconfigs                                                                                 | Opções/herança strict válidas; zero fontes. TS18003 é o diagnóstico esperado de ausência de entradas, não uma aprovação de typecheck |
| `pnpm workspace:list` e filtros de web/api executando `node -p "process.cwd()"`                                                                          | Três projetos reconhecidos; diretórios corretos                                                                                      |
| `git diff --check`, inspeção dos arquivos novos e comparação com o estado aprovado da S0-01c                                                             | Sem whitespace indevido nas configurações; alterações limitadas ao escopo                                                            |
| SHA-256 da especificação e comparação com o original                                                                                                     | Hash `917610528b367257bc1fe2da1a02ac1527e30e6cd2f52052e45cd95e7414e65e` preservado                                                   |

O check inicial de formatação apontou somente os dois documentos editáveis; a aplicação direcionada resolveu as diferenças. O lint inicial identificou o uso de `URL` global na configuração, corrigido com import explícito de `node:url`. Uma tentativa prematura de checks ocorreu antes de terminar a instalação; as verificações finais foram executadas após confirmar as dependências e reproduzir a instalação.

Critérios de aceite:

- [x] Dependências locais, versões exatas e lockfile reproduzível.
- [x] Compatibilidade documentada e peers verificados antes de consolidar as ferramentas.
- [x] ESLint/Prettier configurados na raiz sem duplicação por aplicativo.
- [x] Scripts reais de lint/formatação; `workspace:list` preservado.
- [x] Configurações TypeScript strict íntegras e validadas pelo compilador.
- [x] Especificação protegida do formatter e preservada byte a byte.
- [x] Nenhuma aplicação antecipada, instalação global, commit ou alteração remota.
- [x] Limites e pendências de S0-04/S0-05/S0-06 registrados sem declarar testes não executados.

Referências: [typescript-eslint: versões suportadas](https://typescript-eslint.io/users/dependency-versions/), [ESLint: flat config](https://eslint.org/docs/latest/use/configure/configuration-files) e [Prettier: ignores](https://prettier.io/docs/ignore). Engines/peers exatos foram consultados nos metadados npm das versões instaladas e dos plugins previstos do Next.js/NestJS.

## Pendências rastreáveis

Pendências originalmente abertas na S0-01. As linhas S0-04-Q01/Q02/V01/V02/V03 e S0-05-V01/V02/V03/V04 foram **validadas em 11/10/2026**, com evidências no registro S0-04/S0-05 ao final. S0-06-V01 permanece pendente da execução em CI; a instalação limpa local já foi verificada.

| ID        | Etapa responsável | Validação/entrega esperada                                                                                                                                                     |
| --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S0-04-Q01 | S0-04             | Integrar ESLint dos frameworks/ambientes reais, reavaliar major 9 e configurar lint com tipos quando pertinente                                                                |
| S0-04-Q02 | S0-04             | Implementar scripts reais de typecheck/build/test dos apps e coordenação na raiz, preservando strict e evitando sucesso por scripts ausentes                                   |
| S0-04-V01 | S0-04             | Fixar dependências de Next.js/React/Tailwind, conferir peers e executar typecheck/build do frontend                                                                            |
| S0-04-V02 | S0-04             | Fixar dependências NestJS/TypeScript, conferir peers, módulos, typecheck e build da API                                                                                        |
| S0-04-V03 | S0-04             | Implementar carregamento explícito do ambiente privado da raiz na API; executar aplicativos, validar configuração, rotas de saúde e comunicação web–API                        |
| S0-05-V01 | S0-05             | Fixar Prisma na major 7, client, adapter-pg e pg; configurar carregamento do ambiente privado da raiz e geração com formato coerente com a API; conferir requisitos de sistema |
| S0-05-V02 | S0-05             | Gerar cliente Prisma e comprovar compilação e execução da API com o cliente gerado                                                                                             |
| S0-05-V03 | S0-05             | Conectar ao PostgreSQL real, aplicar migração em banco vazio e executar consulta pelo Prisma                                                                                   |
| S0-05-V04 | S0-05             | Executar seed repetido e verificar idempotência, preservação de `enabled` e constraints no banco separado de testes                                                            |
| S0-06-V01 | S0-06             | Comprovar instalação limpa, checks pertinentes e CI; concluir TA-01/TA-12 no escopo da fundação                                                                                |

S0-01d-P01 concluída no escopo compartilhado. S0-02-D01 concluída no lote atual: ADRs e alterações propostas registrados sem modificar a especificação. Aplicativos e persistência foram validados no lote S0-04/S0-05; CI continua na S0-06.

## Revisão para publicação da S0-01

A revisão final conferiu os 20 arquivos da entrega, incluindo os não rastreados. Não foram identificados arquivos desnecessários, symlinks, ambientes locais ou credenciais reais. Os exemplos contêm apenas placeholder de senha e valores locais; os pacotes dos aplicativos permanecem sem dependências ou fontes.

- Diretório/branch e `main` preservada confirmados antes dos commits.
- Instalação congelada com peers estritos, lint, formatação e workspaces reexecutados e aprovados.
- Todas as entradas do lockfile, seus importers, resoluções por integridade e snapshots com peers foram revisados.
- Ignores, EditorConfig, finais de linha, ambiente, manifests e herança TypeScript strict conferidos.
- Scripts reais confirmados; nenhuma execução de typecheck/build/test de aplicações inexistentes declarada.
- Especificação preservada com o SHA-256 registrado acima.

AJ-S0-01-01: a publicação introduz `docs/requirements.md whitespace=-blank-at-eol` em `.gitattributes`. As 13 linhas com espaços finais são quebras Markdown intencionais do original. A exceção é restrita a esse caminho, mantém os bytes intactos e permite a revisão completa com `git diff --check`; whitespace indevido em um arquivo JSON de teste temporário continuou sendo detectado. Não foram alteradas configurações globais. A exceção de formato do Prettier permanece independente dessa política do Git.

A organização dos commits mantém convenções primeiro, documentação em seguida e workspace/tooling juntos ao final. Assim, a política do documento original antecede sua inclusão, e `package.json`, lockfile e configurações das ferramentas entram no mesmo commit, sem scripts intermediários que referenciem ferramentas ausentes. Cada staging tem seus caminhos conferidos explicitamente antes do commit.

Milestone e Issue S0-01 foram criados após consulta de itens existentes, sem duplicação. Nenhuma outra Issue da sprint, workflow, proteção de branch, release ou tag faz parte desta publicação. O PR deve conter `Closes #1`; a Issue só será concluída pelo vínculo quando a integração for autorizada e realizada.

## S0-02 — Documentação e decisões arquiteturais

Referências: HU-12; RNF-001/002/003/006/016/019; seções 13–15. S0-02 documenta os contratos operacionais utilizados na S0-03; nenhuma aplicação é antecipada.

- [x] ADR-001: pnpm workspaces, monólito modular e frontend/API separados.
- [x] ADR-002: PostgreSQL, Prisma 7 futuro e instâncias independentes.
- [x] ADR-003: adapters para APIs públicas; consultas manuais e dados desconhecidos preservados.
- [x] ADR-006/007: ambientes privados/públicos e GitHub Flow.
- [x] Arquitetura, CONTRIBUTING, templates de tarefas/bugs e Pull Request.
- [x] README e operação do banco documentados com comandos reais.
- [x] Decisões complementares em `requirements-proposed-changes.md`; v1.0 intacta.

ADRs contêm contexto, decisão, justificativa, consequências e alternativas. ADR-004/005 permanecem reservados aos contratos dos conectores e à política de datas/status da especificação. Documentação distingue infraestrutura homologada e validações futuras de aplicações. Fontes reais de seed, licença e hospedagem permanecem decisões futuras.

## S0-03 — PostgreSQL local e testes isolados

Referências: RF-001; HU-01/HU-12; RNF-001/006/016. **Entrega homologada em 11/10/2026**: configuração, saúde, conectividade, autenticação, persistência e isolamento aprovados. [Diagnóstico e evidências da recuperação](postgresql-recovery.md).

- `compose.yaml`: PostgreSQL `17.11-trixie`, fixado pelo digest OCI `sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3`; substituição da variante Bookworm documentada no ADR-002.
- Serviços `postgres` e `postgres-test` (profile `test`), com redes e volumes próprios.
- Portas configuráveis publicadas somente em `127.0.0.1`, padrões 5432/5433.
- Variáveis obrigatórias, SCRAM para TCP, healthcheck `pg_isready` e logs com rotação (10 MB × 3).
- `.env.example` com placeholders; `.env` local ignorado e privado, sem credenciais incluídas na entrega.
- Scripts `db:config`, `db:up`, `db:stop`, `db:status`, `db:logs`, `db:test:up`, `db:test:stop`, `db:test:logs` e `db:verify`.
- Verificador Node sem dependências adicionais: cria projeto único, portas disponíveis, credenciais aleatórias, testa configuração, saúde, TCP/SQL/autenticação, persistência e isolamento. Para somente seus containers e preserva volumes; não utiliza o projeto diário.
- Nenhum schema Prisma, migração ou seed do produto. A tabela SQL de prova foi criada somente nos bancos novos do verificador.

### Histórico: primeira retomada em 11/10/2026

| Comando/verificação                                       | Resultado observado                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Git, Issues e PRs                                         | Branch correta; main/origin/main/HEAD em `acaff60`; PR #2 MERGED; Issues #3/#4 existentes, sem duplicação                                                    |
| `docker version`, `docker compose version`, `docker info` | Inicialmente responderam CLI/Engine 29.8.2, Compose 5.5.1, Docker Desktop                                                                                    |
| `docker ps -a`, `docker volume ls`, `docker network ls`   | Nenhum container/volume anterior; apenas redes padrão bridge/host/none                                                                                       |
| Pull da imagem fixada                                     | Download concluído; digest corresponde ao Compose                                                                                                            |
| `pnpm db:config`                                          | Configuração resolvida sem imprimir credenciais                                                                                                              |
| `pnpm db:verify`                                          | Configuração válida e rejeição de senha vazia/porta inválida passaram; inicialização falhou com HTTP 502 em containers/create                                |
| Diagnóstico após falha                                    | CLI Linux SIGBUS; kernel registra I/O error em loop0; socket /_ping não responde; CLI Windows excede timeout                                                 |
| Instalação congelada com peers estritos                   | Passou; lockfile inalterado                                                                                                                                  |
| Lint e workspaces                                         | Passaram; raiz/web/api reconhecidos, filtros selecionam os diretórios corretos                                                                               |
| YAML, ADRs, links locais e LF                             | Sintaxe, seções obrigatórias, caminhos e finais de linha validados                                                                                           |
| Ignores e integridade                                     | `.env` ignorado; Compose, lockfile e migrações elegíveis; especificação idêntica ao original por bytes e SHA-256; tsconfigs/workspace/lockfile iguais à main |

A falha ocorreu após criar as redes e os volumes `internradar-check-0c06fac7328e_postgres_data` e `internradar-check-0c06fac7328e_postgres_test_data`. Todos permanecem preservados; nenhum comando de remoção de volumes foi executado. Não foi possível concluir a inspeção do daemon após a falha nem confirmar containers eventualmente criados. Os testes não se conectaram ao banco e não executaram a tabela de prova. A falha ao parar o projeto também retorna status de erro; não é ocultada pelo script.

### Acompanhamento das validações

| ID        | Resultado necessário                                                                                 | Estado                                     |
| --------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| S0-03-V01 | Inicializar dois serviços e confirmar saúde, TCP no host e SQL autenticado                           | Concluído em 11/10/2026                    |
| S0-03-V02 | Confirmar dados após restart/recriação de containers próprios e isolamento de clusters/redes/volumes | Concluído em 11/10/2026                    |
| S0-03-V03 | Rejeitar senha SQL incorreta e inspecionar estado final do projeto de teste                          | Concluído em 11/10/2026                    |
| S0-03-P01 | Publicar o progresso em Draft PR com limitações e preservar main/volumes                             | Concluído no PR #5; homologação atualizada |

S0-04: aplicativos, ambiente privado carregado explicitamente, saúde/comunicação e typecheck/build. S0-05: Prisma major 7, geração/build/runtime, entidades, migrações e seed idempotente no banco separado de testes. S0-06: CI dos comandos reais. Nenhuma dessas validações foi declarada executada neste lote.

Revisão estática da primeira retomada: `pnpm format:check`, `pnpm lint`, `node --check scripts/verify-database.mjs` e `git diff --check` aprovados; whitespace dos arquivos não rastreados também validado. API TypeScript confirmou herança strict dos três tsconfigs, sem fontes ou typecheck de aplicativos. Foram revisados 34 arquivos versionáveis; nenhuma senha do ambiente local ou padrão de token/chave privada foi encontrado. O `.env` permanece ignorado, com modo 0600. Naquele momento, ainda não havia commit, push ou PR do lote.

### Histórico: tentativa após liberação de espaço no C: — 11/10/2026, 04:58 UTC

A tentativa inicial falhou antes de acessar o Engine: `timeout: failed to run command ‘docker’: Input/output error` (status 126). `/usr/bin/docker` aponta para `/mnt/wsl/docker-desktop/cli-tools/usr/bin/docker`; o socket existe, mas não foi testado novamente após identificar I/O, conforme orientação do responsável. O kernel registrou novos erros de leitura em `loop0`.

`df -h /mnt/c` informa 4,6 GB disponíveis em 238 GB, ocupação 99%. A causa exata não foi confirmada; liberar espaço não restabeleceu o executável nesta sessão. Testes Docker interrompidos, sem executar `pnpm db:verify` nesta tentativa e sem inspecionar ou modificar recursos pelo daemon. Estado atual dos containers/volumes permanece não confirmado. Nenhuma remoção, restart ou recriação executada.

Branch e alterações anteriores preservadas; main/HEAD/origin/main em `acaff60`. SHA-256 da especificação e do lockfile preservados; `git diff --check` aprovado. Commits, push e PR continuam pendentes da homologação real.

### Histórico: recuperação do Engine e falha da imagem — 11/10/2026

Os clientes Windows e Ubuntu retornaram o mesmo ID `6400e8db-a5da-49fc-8e50-02d142a8749f`, Engine 29.8.2 e Docker Desktop; Compose 5.5.1. `df` registrou cerca de 17 GiB livres no C: (a diferença para GB decimais explica aproximadamente 18,68 GB informados pelo responsável). O backup do VHDX foi informado pelo responsável; sua cópia não foi criada nem revalidada pelo agente.

Inspeção inicial: nenhum container/volume registrado. Imagens hello-world e PostgreSQL com o digest fixado presentes. Permaneceram as redes `internradar-check-0c06fac7328e_development` e `internradar-check-0c06fac7328e_testing`; não foram removidas. A ausência dos volumes anteriormente criados descreve o estado registrado no Engine, sem inferir como ocorreu sua recuperação.

| Verificação atual                                     | Evidência                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `docker run --rm hello-world`                         | Executou e encerrou com status 0; container efêmero sem volume                                                     |
| Comparação do kernel com baseline anterior ao teste   | Nenhum novo erro de I/O/SIGBUS/crash no intervalo observado; erros antigos permanecem no histórico                 |
| Revisão do verificador                                | Projeto aleatório próprio, portas/credenciais próprias, sem remoção de volumes ou operações sobre o projeto diário |
| `pnpm db:config`                                      | Aprovado                                                                                                           |
| `pnpm db:verify`                                      | Configuração válida e erros de variáveis/porta passaram; containers criados/iniciados, mas ficaram unhealthy       |
| Logs dos dois containers                              | `exec /usr/local/bin/docker-entrypoint.sh: exec format error`                                                      |
| Plataforma                                            | Engine linux/x86_64; imagem linux/amd64, sem divergência de arquitetura identificada                               |
| `docker cp` do entrypoint do container próprio parado | Leitura bem-sucedida; arquivo vazio, 0 bytes                                                                       |
| Pull explícito do mesmo digest para linux/amd64       | Status “Image is up to date”; cache existente reutilizado, sem novo download de camadas                            |
| Saúde/SQL/persistência/isolamento real                | Não aprovados: PostgreSQL não inicializou; tabela de prova não executada                                           |
| Instalação congelada, lint, formatação e workspaces   | Aprovados; dependências e lockfile preservados                                                                     |

O entrypoint vazio é evidência de inconsistência no conteúdo local da imagem/container; corrupção decorrente dos incidentes anteriores é uma hipótese, não uma causa comprovada. Não foi alterada a imagem fixada, aplicado override de entrypoint, apagado cache ou removido recurso para contornar a falha. Não houve repetição da suíte depois desse diagnóstico.

O verificador parou os containers próprios `internradar-check-e3dcaedf6932-postgres-1` e `internradar-check-e3dcaedf6932-postgres-test-1`. Volumes `internradar-check-e3dcaedf6932_postgres_data` e `internradar-check-e3dcaedf6932_postgres_test_data`, redes e containers permanecem preservados. Nenhum volume anterior foi utilizado, apagado ou reinicializado.

Esse progresso foi publicado no **Draft PR #5**, commits `701d129` (infraestrutura) e `f031687` (documentação), com as Issues #3/#4 abertas. Naquele momento, S0-03 permanecia pendente das verificações V01/V02/V03. A recuperação seguinte resolveu o bloqueio sem remover recursos.

### Recuperação da imagem e homologação concluída — 11/10/2026

O diagnóstico comparou containers antigos, um novo sem volumes existentes e o conteúdo do registry oficial. O entrypoint local estava vazio também no novo container, sem alterações na camada gravável; PostgreSQL ainda encontrou `libzstd.so.1: file too short`. No registry, o script do mesmo digest tinha 14.577 bytes. Há inconsistência no conteúdo local compartilhado, sem comprovar se está no blob comprimido ou no snapshot descompactado.

A variante oficial Debian Trixie preserva PostgreSQL 17.11 e o caminho de dados, com camadas independentes da imagem Bookworm local. Entrypoint, sete arquivos essenciais e binários foram verificados antes do Compose. O ADR-002 registra a decisão e a necessidade de análise de collation/backup para clusters antigos; a homologação usou exclusivamente volumes novos.

- `pnpm db:config` e `pnpm db:verify`: status 0, todos os critérios V01/V02/V03 aprovados no projeto `internradar-check-74f4d78f5fa0`.
- Proteção adicional no verificador: conferir os nomes e montagens resolvidos antes de criar containers. Teste negativo com volume externo existente recusado; inventário inalterado.
- Dois healthchecks, protocolo no host, SQL autenticado, senha incorreta rejeitada, marcadores isolados e persistência após restart/recriação comprovados.
- Inventário inicial preservado; containers próprios encerrados com exit 0 e volumes mantidos. Engine estável, sem novos erros de I/O/SIGBUS/filesystem no intervalo observado.
- Especificação original, TypeScript strict, dependências e lockfile preservados. Sem teste de aplicações/Prisma/CI antecipado.

Revisão final da recuperação: `pnpm install --frozen-lockfile --strict-peer-dependencies`, `pnpm lint`, `pnpm format:check`, `pnpm workspace:list`, `pnpm list --depth 0`, `node --check scripts/verify-database.mjs` e `git diff main --check` aprovados. Os 35 arquivos versionáveis passaram na revisão de credenciais locais/padrões de segredo, YAML/JSON, links, ADRs e LF. O parser YAML considera os múltiplos documentos do lockfile pnpm. API TypeScript confirmou strict nos três tsconfigs; `.env` segue ignorado, modo 0600. SHA-256 da especificação: `917610528b367257bc1fe2da1a02ac1527e30e6cd2f52052e45cd95e7414e65e`, com igualdade de bytes ao original.

Inventário, digests, verificações de integridade e limites constam em [postgresql-recovery.md](postgresql-recovery.md). Na conclusão dessa recuperação, Issues #3/#4 permaneceram abertas até a integração posteriormente autorizada do PR #5. Nenhum merge, tag, release ou limpeza de recursos fez parte da recuperação.

## S0-04/S0-05 — Aplicações e persistência

PR #5 integrado por rebase em `2507b8ccfea3da388dea67e16a1e99677624d094`; Issues #3/#4 fechadas automaticamente. Branch `feat/s0-04-05-apps-prisma` derivada da main sincronizada. Issues [#6](https://github.com/felipe-rodriguesz/InternRadar/issues/6) e [#7](https://github.com/felipe-rodriguesz/InternRadar/issues/7). Branches anteriores preservadas.

### Inicialização S0-04 — 11/10/2026

Next.js 16.4.0, React 19.3.0, Tailwind 4.3.3 e NestJS 12.1.2 instalados nos respectivos workspaces. Node 24.21.0, pnpm 12.12.0 e TypeScript 6.0.3 mantidos. ESLint 9.39.5 mantido após conferir peers React/JSX accessibility; `eslint-config-next` 16.4.0 aplicado somente à web. O aviso de depreciação do ESLint permanece conhecido; major 10 depende da compatibilidade dos plugins. Scripts de instalação esbuild/unrs-resolver revisados e permitidos por versão no workspace.

API CommonJS usa `module/moduleResolution: NodeNext` para modelar `require(esm)` do Node 24 com NestJS 12. `Node16` não modelava esse suporte; o ajuste foi comprovado com compilação e execução. `tsx` serve ao desenvolvimento; injeções futuras usarão tokens explícitos, sem depender da emissão de metadata pelo esbuild.

- Lint, typecheck e builds reais Next.js/NestJS aprovados.
- Três testes de API aprovados: ambiente válido, rejeições de ambiente e HTTP real (health, alias, CORS e 404 sanitizado).
- Seis testes Playwright aprovados em Chromium/Firefox: integração real, loading, falha de rede/recuperação e viewport 375 px/teclado. Screenshot móvel inspecionado.
- Nesta etapa, saúde declara banco `not_checked`; a conexão real será introduzida na S0-05. `/health` redireciona com 307 para `/api/v1/health`.
- `next dev` gera `apps/web/AGENTS.md`; mantido no repositório. Declarações `next-env.d.ts` são geradas e ignoradas.

### Persistência S0-05 — 11/10/2026

Prisma CLI/client/adapter-pg 7.10.0 e pg 8.23.1 fixados. Cliente `prisma-client` gerado em CommonJS, carregado por NestJS compilado e em desenvolvimento. `GET /api/v1/health` agora executa `SELECT 1`: retorna `connected` somente após sucesso; falha real de banco resulta em 503 sanitizado. O frontend distingue API inacessível de API acessível com banco indisponível.

- Quatro entidades, enums e relações da seção 8 implementados. Migração `20261011063000_init` aplicada em banco de desenvolvimento vazio e schema vazio no cluster de testes.
- UUIDs nativos, unicidades compostas, região obrigatória/default GLOBAL, enabled true, campos/datas opcionais e contadores não negativos comprovados. CHECKs/trigger versionados protegem invariantes, incluindo firstSeenAt imutável.
- Seed CLI executado duas vezes. Figma/Greenhouse e Spotify/Lever foram verificados por HTTP 200; sem vagas artificiais ou coleta implementada. Evidências em [seed-sources.md](seed-sources.md).
- Oito testes de persistência reais aprovados, incluindo seed idempotente/IDs estáveis/disabled preservado, relações/defaults, unicidades, upsert concorrente, FKs/restrições de exclusão, enums/URLs/textos, contadores/datas e isolamento.
- Testes usam o schema novo `check_0bdfa305fe194f7c9c7cb9d6fc4d6077`, preservado no cluster separado. Identificadores dos clusters comparados antes de escrever; inventário e contagens de desenvolvimento permaneceram iguais após a suíte. Nenhum mock substituiu acesso ao PostgreSQL.
- Quatro testes de ambiente/HTTP da API aprovados, incluindo conexão real recusada e HTTP 503 sem vazamento de credenciais.
- Oito testes web aprovados em Chromium/Firefox: conexão real/retry, 503 visual simulado, loading/falha de rede/recuperação e viewport 375 px/teclado. A simulação de erro da interface é separada da falha SQL real testada na API.

Uma execução intermediária em `next dev` falhou no Firefox: a resposta HTTP 200 foi observada, mas a interface terminou em erro. A causa exata não foi confirmada; a suíte foi ajustada para os builds de produção, conforme a orientação do Next.js para E2E, e passou integralmente. Não há retries automáticos mascarando falhas. API/web também foram iniciadas separadamente no workspace: sem API, a interface exibiu falha; com a API, confirmou PostgreSQL. Acesso pelo navegador em `http://localhost:3000` no WSL validado.

### Preservação da infraestrutura

A porta 5432 já era ocupada por PostgreSQL 16 nativo do Ubuntu, com encaminhamento WSL. A tentativa de iniciar o novo projeto padrão falhou por conflito de porta, sem erro de I/O. Serviço nativo, clusters antigos, imagens e redes não foram removidos ou alterados para liberar a porta.

O `.env` privado foi ajustado para `COMPOSE_PROJECT_NAME=internradar-apps`, portas locais 15432/15433 e URLs correspondentes. Dois volumes novos, distintos, inicializados exclusivamente com PostgreSQL 17.11 Trixie homologado. O container/volume padrão vazio criado na tentativa anterior também permanece preservado. Não houve reutilização de clusters Bookworm nem alteração do digest do Compose.

Ambos os containers diários permaneceram healthy. Cerca de 15 GiB livres no C: durante a validação; nenhum novo erro de I/O/SIGBUS observado. A suíte antiga `db:verify` não foi repetida: já homologada na S0-03, criaria novos volumes desnecessários. Foram executados os testes específicos de Prisma neste lote.

### Critérios e próximas tarefas

- [x] Aplicações reais, strict, lint dos frameworks e scripts centrais/individuais.
- [x] Ambiente validado, CORS restrito e URLs/segredos separados por responsabilidade.
- [x] Frontend responsivo/acessível com loading, sucesso, erro e nova tentativa.
- [x] Prisma gerado, compilado e executado com NestJS/PostgreSQL.
- [x] Migração versionada, consultas/gravações reais, constraints e seed idempotente.
- [x] Testes de persistência isolados, enabled=false preservado e recursos antigos mantidos.
- [x] Especificação v1.0 preservada; decisões novas em ADR-008 e alterações complementares.
- [ ] S0-05-P01: verificar um board Ashby antes de S2-01. Endpoints consultados retornaram 403; nenhum identificador Ashby foi incluído no seed sem evidência.
- [ ] S0-06-V01: provisionar banco/browsers no GitHub Actions e executar os comandos reais; configuração de ambiente em runner limpo e critérios TA-01/TA-12 em CI.
- [ ] S0-06-P01: acompanhar suporte dos plugins à major seguinte do ESLint; major 9 permanece compatível e fixada.

Builds/integração não representam implementação de conectores, sincronização, listagem de vagas ou outras funcionalidades futuras. S0-06 não foi implementada neste lote.

### Verificação final em instalação reproduzível

Uma cópia dos arquivos candidatos, sem node_modules, client gerado ou builds, foi preparada fora do checkout, sem criar outro repositório. O `.env` privado foi copiado somente para esse diretório local protegido, nunca para o Git. `pnpm install --frozen-lockfile --strict-peer-dependencies` instalou 577 pacotes com versões/peers resolvidos e lockfile inalterado. Não houve instalação global.

Nessa cópia passaram, em sequência: `pnpm prisma:generate`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test` (4 API + 8 Playwright) e `pnpm workspace:list` (raiz/api/web). A geração, compilação e execução do NestJS com Prisma foram reproduzidas. A suíte de persistência de 8 testes foi executada anteriormente no checkout; não foi repetida sem necessidade.

O lint por workspace identificou inicialmente um aviso de descoberta do diretório Next.js, pois rootDir dependia do diretório de execução. A configuração agora resolve esse caminho a partir do arquivo ESLint; lint da raiz e de ambos os workspaces passou sem esse aviso, inclusive na cópia limpa.

No checkout final: Prisma validate e migrate status aprovados (uma migração aplicada), `db:config`, formatação e `git diff main --check` aprovados. A API compilada também respondeu HTTP 200/connected via localhost tanto no Ubuntu quanto pelo PowerShell do Windows. Os servidores próprios de verificação foram encerrados.

Revisão dos 71 arquivos candidatos: JSON/YAML/LF válidos, nenhuma credencial local/padrão de token/chave privada encontrado; bundles públicos sem DATABASE_URL ou senhas do `.env`. Exemplos/lockfile/migrações continuam versionáveis, segredos/artefatos ignorados. Especificação idêntica por bytes/SHA-256 ao original; Compose, digest, tsconfig.base, gitattributes e EditorConfig preservados.

Inventário final: 8 containers, 7 volumes, 12 redes e 3 imagens. Os 5 containers, 4 volumes e 9 redes do inventário inicial permanecem presentes. Dois containers diários healthy, publicados somente em 127.0.0.1:15432/15433. A comparação do kernel, normalizando prefixos de prioridade do baseline, confirmou que os erros de I/O presentes eram anteriores ao lote; nenhum novo erro foi identificado.

## S0-06 — CI e transição para Sprint 1

PR #8 integrado por rebase em 11/10/2026, main `200298c8b0409eb019579665f06f8f4dacf76b36`, com três commits preservados; Issues #6/#7 fechadas automaticamente. Nenhuma branch antiga excluída. Nova branch `feat/s0-06-s1-01-02-ci-greenhouse`.

[S0-06 / Issue #9](https://github.com/felipe-rodriguesz/InternRadar/issues/9) pertence ao Milestone Sprint 0. Issues #10/#11 e Milestone Sprint 1 acompanham contratos/Greenhouse; [registro](sprint-1.md).

Pipeline implementada em `.github/workflows/ci.yml`, com versões do projeto, actions por SHA, token contents:read, dois clusters efêmeros PostgreSQL, geração/migração/seed, lint/format/strict/build, testes unitários/HTTP/persistência e Playwright Chromium/Firefox. Serviços pertencem exclusivamente ao runner; Compose/digest local permanecem intactos. [Operação e segurança](ci.md).

S0-06-V01/TA-01/TA-12 remotos aguardam a execução efetiva do workflow após publicação do PR. Nenhuma homologação remota é inferida somente da presença do YAML. A pendência Ashby e o acompanhamento da major do ESLint permanecem registrados.
