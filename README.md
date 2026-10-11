# InternRadar

Plataforma Full Stack de monitoramento de vagas de estágio, desenvolvida de forma incremental como projeto pessoal e de portfólio.

A [especificação oficial](docs/requirements.md) orienta todas as implementações. Sua versão 1.0 foi incorporada sem alterações; revisões serão documentadas separadamente e versionadas.

## Estado atual

Sprint 0 — Project Foundation: ambiente (S0-01a), monorepo (S0-01b), arquivos locais/ambiente (S0-01c) e ferramentas compartilhadas de qualidade (S0-01d) preparados. Frontend, API e banco ainda serão inicializados nas tarefas correspondentes. O [acompanhamento da sprint](docs/sprint-0.md) registra resultados, critérios e validações pendentes.

## Arquitetura do workspace

Um monorepo mantém aplicativos separados no mesmo repositório. Isso permite revisar mudanças de frontend e backend em conjunto, compartilhar políticas de ferramentas e instalar dependências com um único lockfile, preservando a responsabilidade de cada aplicativo.

```text
InternRadar/
├── apps/
│   ├── web/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   ├── requirements.md
│   └── sprint-0.md
├── .editorconfig
├── .env.example
├── .gitattributes
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
└── README.md
```

| Pacote             | Responsabilidade                                                   | Inicialização prevista |
| ------------------ | ------------------------------------------------------------------ | ---------------------- |
| `@internradar/web` | Interface Next.js, React e Tailwind; acessará a API do InternRadar | S0-04                  |
| `@internradar/api` | API NestJS; concentrará regras de negócio e acesso ao banco        | S0-04; Prisma na S0-05 |

Os manifests identificam os pacotes, mas ainda não contêm dependências ou scripts de aplicações. Não existe dependência direta entre web e API. Contratos compartilhados poderão se tornar um pacote próprio quando houver necessidade concreta.

## Pré-requisitos

- Node.js **24.21.0**, conforme `.nvmrc` e `engines.node`.
- pnpm **12.12.0**, conforme `packageManager` e `engines.pnpm`.
- Git. O desenvolvimento atual ocorre no Ubuntu via WSL2.
- Docker Desktop integrado ao WSL2 e Docker Compose serão utilizados na S0-03.

Com nvm já instalado, `nvm use` seleciona a versão indicada em `.nvmrc`. O Corepack já disponível encaminha a execução ao pnpm registrado em `packageManager`. Não é necessária uma instalação global adicional para este incremento.

## Instalação e inspeção

Na raiz do checkout, tanto no Ubuntu/WSL quanto no PowerShell:

```sh
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm workspace:list
pnpm --filter @internradar/web --fail-if-no-match exec node -p "process.cwd()"
pnpm --filter @internradar/api --fail-if-no-match exec node -p "process.cwd()"
```

A listagem deve apresentar a raiz `internradar` e os dois aplicativos. Os comandos com filtros demonstram que o pnpm seleciona cada pacote no diretório correto. A instalação inclui as ferramentas de desenvolvimento da raiz; os manifests dos aplicativos ainda não declaram dependências.

## Configurações e dependências

| Arquivo                | Responsabilidade                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `package.json` da raiz | Identidade privada do projeto, versões de Node/pnpm e script `workspace:list`                                       |
| `pnpm-workspace.yaml`  | Descoberta de `apps/*`, lockfile compartilhado, verificação de engines e gravação de versões exatas                 |
| `pnpm-lock.yaml`       | Estado de resolução de todos os pacotes, gerado pelo pnpm; será atualizado ao adicionar dependências                |
| `.nvmrc`               | Seleção explícita do Node no nvm                                                                                    |
| `tsconfig.base.json`   | Política comum de TypeScript strict, verificação de índices, consistência de nomes e bloqueio de emissão com erros  |
| `apps/*/tsconfig.json` | Herança da base estrita e delimitação dos arquivos de cada aplicativo                                               |
| `.gitignore`           | Exclui ambientes locais, dependências, builds, caches e temporários; mantém exemplos, lockfile e migrações visíveis |
| `.gitattributes`       | Define LF para textos e CRLF para scripts `.bat`/`.cmd` no checkout, sem alterar configurações globais              |
| `.editorconfig`        | Orienta editores compatíveis sobre UTF-8, indentação e finais de linha                                              |

As dependências de execução serão declaradas no aplicativo que as utiliza: Next.js/React em web e NestJS/Prisma em api. Ferramentas comuns de desenvolvimento poderão ficar na raiz. Para adicionar uma dependência posteriormente, utilizaremos `pnpm --filter <pacote> add <dependência>@<versão>`; ferramentas comuns usarão `pnpm add --workspace-root --save-dev <dependência>@<versão>`.

`savePrefix: ''` grava versões diretas exatas quando adicionamos uma versão explícita ou uma dependência sem intervalo. As resoluções transitivas ficam no lockfile único. `pnpm install --frozen-lockfile` exige que manifests e lockfile estejam consistentes. `pmOnFail: error` interrompe o comando se a versão do pnpm divergir da versão registrada. Todos os pacotes são privados, pois são partes do produto, sem publicação npm prevista.

Os aplicativos herdam `strict: true`. O compilador TypeScript está instalado na raiz; opções específicas de navegador, módulos, decorators, resolução e emissão serão configuradas com os frameworks na S0-04. Não há scripts de typecheck, build ou testes dos aplicativos nesta etapa; eles serão introduzidos quando houver código e ferramentas específicos para executar.

Referências: [pnpm workspaces](https://pnpm.io/workspaces), [configurações do pnpm](https://pnpm.io/settings) e [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html).

## Qualidade e formatação

As ferramentas de qualidade são dependências de desenvolvimento locais da raiz, com versões diretas exatas e resolução transitiva no lockfile. Os scripts do pnpm utilizam esses executáveis locais, permitindo repetir as verificações sem instalações globais.

| Comando na raiz          | Responsabilidade atual                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format <arquivos>` | Formatar somente os caminhos indicados; exige argumentos para evitar escrita em massa por padrão                           |
| `pnpm format:check`      | Verificar os formatos suportados do workspace sem modificar arquivos                                                       |
| `pnpm lint`              | Analisar JavaScript/TypeScript com ESLint e falhar também em avisos; atualmente o arquivo analisável é `eslint.config.mjs` |
| `pnpm workspace:list`    | Listar raiz e aplicativos reconhecidos                                                                                     |

Exemplo de formatação direcionada:

```sh
pnpm format eslint.config.mjs .prettierrc.json README.md docs/sprint-0.md
pnpm format:check
pnpm lint
```

O ESLint faz análise estática: lê o código sem executar a aplicação e procura problemas como identificadores indefinidos ou variáveis não utilizadas. A configuração compartilhada usa regras recomendadas para JavaScript/TypeScript e importa os ignores do `.gitignore`, evitando manter duas listas de artefatos. Regras específicas de React/Next.js, ambientes de execução e lint que dependa de informações de tipos serão completados com os aplicativos na S0-04.

O Prettier padroniza a apresentação do código e dos documentos. A configuração estabelece aspas simples, ponto e vírgula, LF e largura de referência de 100 caracteres; preserva a quebra dos parágrafos Markdown. `eslint-config-prettier`, aplicado por último, desativa regras de estilo que poderiam conflitar com o formatter. `.prettierignore` protege integralmente `docs/requirements.md` e `pnpm-lock.yaml`; eles continuam elegíveis para versionamento e ficam fora tanto da escrita quanto da verificação de formato. O lockfile é mantido pelo pnpm. Arquivos ignorados pelo Git também ficam fora do Prettier executado da raiz.

TypeScript strict aumenta as verificações sobre tipos, valores nulos e tipos implícitos, ajudando a detectar inconsistências antes da execução. Nesta etapa, o compilador foi usado para validar opções e herança dos tsconfigs; como não existem arquivos-fonte dos aplicativos, não houve typecheck de código ou build. Scripts `typecheck`, `build` e `test` continuam pendentes da S0-04 e das etapas de testes/persistência.

Foram fixados ESLint 9.39.5 e TypeScript 6.0.3: os plugins React/import/acessibilidade consultados para Next.js ainda não aceitam ESLint 10, e `typescript-eslint` 8.71.1 suporta TypeScript abaixo de 6.1, enquanto os geradores NestJS 12 exigem TypeScript >=6. O registry marca a linha ESLint 9 como deprecated; a combinação será reavaliada ao integrar Next.js na S0-04. Isso registra a compatibilidade documentada, sem declarar integração de aplicações já testada.

No monorepo, a raiz mantém ferramentas e políticas comuns, enquanto cada aplicativo terá seus scripts de execução/build específicos. Após sua criação, `pnpm --filter @internradar/web <script>` e `pnpm --filter @internradar/api <script>` executarão comandos no pacote selecionado. Scripts centrais poderão coordenar essas verificações sem ocultar scripts ausentes. Na S0-06, GitHub Actions executará a instalação congelada e os mesmos checks pertinentes em PRs; nenhum workflow foi criado nesta etapa.

Referências: [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files), [compatibilidade do typescript-eslint](https://typescript-eslint.io/users/dependency-versions/) e [exceções do Prettier](https://prettier.io/docs/ignore).

## Ambiente local

Variáveis de ambiente são valores externos ao código usados para configurar endereços, portas e credenciais. Os arquivos `.env.example` documentam os nomes e valores de referência necessários para reproduzir o ambiente; eles são versionáveis e contêm apenas configurações locais e placeholders.

| Arquivo local ignorado | Modelo versionável      | Responsabilidade                                                                                          |
| ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `.env` na raiz         | `.env.example`          | Infraestrutura compartilhada `POSTGRES_*` e configurações privadas `API_HOST`, `API_PORT`, `DATABASE_URL` |
| `apps/web/.env.local`  | `apps/web/.env.example` | Endereço público da API em `NEXT_PUBLIC_API_BASE_URL`                                                     |

Na raiz do checkout, crie suas cópias locais somente se ainda não existirem. No Ubuntu/WSL:

```bash
if [ ! -e .env ]; then cp .env.example .env; fi
if [ ! -e apps/web/.env.local ]; then cp apps/web/.env.example apps/web/.env.local; fi
```

No PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
```

Substitua `CHANGE_ME_LOCAL_ONLY` na cópia local e mantenha `DATABASE_URL` coerente com `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` e `POSTGRES_DB`. A URL do banco não expande essas variáveis automaticamente neste exemplo; caracteres especiais em usuário/senha precisam de percent-encoding na URL. Se alterar `API_PORT`, ajuste também `NEXT_PUBLIC_API_BASE_URL`.

A raiz foi escolhida como origem das configurações privadas da API/Prisma, evitando duplicar credenciais em `apps/api`. O Compose utilizará essa configuração na S0-03; o carregamento explícito pela API e pelos comandos Prisma será implementado e validado na S0-04/S0-05. Os exemplos ainda não iniciam ou configuram serviços por conta própria. Nenhum `.env` local foi criado nesta entrega.

No Next.js, variáveis sem `NEXT_PUBLIC_` ficam disponíveis no servidor; o prefixo permite incluir valores no JavaScript entregue ao navegador durante o build. Portanto, o exemplo do frontend contém somente um endereço público, sem usuário/senha de banco, tokens ou chaves. O frontend terá seu ambiente na raiz de `apps/web`, onde o Next.js será inicializado, e não receberá o arquivo privado da raiz do monorepo. [Documentação de ambiente do Next.js](https://nextjs.org/docs/app/guides/environment-variables).

## Arquivos ignorados e edição

O `.gitignore` controla quais arquivos não rastreados ficam fora do versionamento; não remove arquivos já rastreados. Apenas `.env.example` é liberado entre os nomes `.env*`. Não use `git add -f` para incluir ambientes locais. O lockfile, schema/seed/migrações Prisma, fontes, documentos e configurações compartilhadas de editor permanecem elegíveis para versionamento.

O `.gitattributes` controla como o Git trata os arquivos, incluindo seus finais de linha. Textos usam LF, adequado aos scripts e ferramentas no WSL2/Linux; `.bat` e `.cmd` usam CRLF no checkout. Arquivos binários são detectados automaticamente. A exceção `whitespace=-blank-at-eol` apenas para `docs/requirements.md` preserva as quebras Markdown do documento original no check do Git, mantendo as demais verificações. Não foi executada renormalização em massa, e os arquivos existentes já utilizavam LF.

O `.editorconfig` orienta editores compatíveis a salvar com UTF-8, dois espaços, newline final e a mesma política de finais de linha. Em Markdown, espaços ao fim da linha são preservados por poderem representar quebras de linha. Ele complementa o Prettier e não reformata arquivos sozinho. A especificação original permanece intacta.

Referências: [Git ignore](https://git-scm.com/docs/gitignore), [Git attributes](https://git-scm.com/docs/gitattributes) e [EditorConfig](https://editorconfig.org/).

## Fluxo de desenvolvimento

Adotamos GitHub Flow: Issue → branch de trabalho → commits Conventional Commits → verificações → Pull Request → revisão → integração. A entrega S0-01 usa `chore/s0-01-foundation-tooling`, derivada da `main` existente, e está registrada na [Issue #1](https://github.com/felipe-rodriguesz/InternRadar/issues/1), associada ao [Milestone Sprint 0 — Project Foundation](https://github.com/felipe-rodriguesz/InternRadar/milestone/1). As quatro subtarefas locais foram aprovadas; a publicação do PR foi autorizada e o merge depende de autorização específica.

Cada incremento requer revisão antes da próxima tarefa. Consulte [docs/sprint-0.md](docs/sprint-0.md) para os limites e pendências atuais.
