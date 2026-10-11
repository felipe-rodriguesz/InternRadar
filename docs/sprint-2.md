# Sprint 2 — Completar o MVP

[Milestone 3](https://github.com/felipe-rodriguesz/InternRadar/milestone/3). Lote S2-01/S2-02/S2-03, branch `feat/s2-01-02-03-connectors-details-sources`. Especificação v1.0 preservada.

| Entrega | Issue                                                             | Implementação                                                            |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| S2-01   | [#17](https://github.com/felipe-rodriguesz/InternRadar/issues/17) | Ashby/Lever, transporte compartilhado, registry, visibilidade e fixtures |
| S2-02   | [#18](https://github.com/felipe-rodriguesz/InternRadar/issues/18) | GET /jobs/:id e página /jobs/[id], navegação/links/datas seguros         |
| S2-03   | [#19](https://github.com/felipe-rodriguesz/InternRadar/issues/19) | Empresas, fontes e histórico REST; /sources e /sync-runs de leitura      |

## Integração anterior

PR #16 integrado por rebase em 11/10/2026, 08:15:09 UTC. HEAD revisado 38cb7feaa82d6a4c0e731a514861c108699ffa52, CI [38123546105](https://github.com/felipe-rodriguesz/InternRadar/actions/runs/38123546105) aprovada no mesmo commit, árvore limpa e ausência de conflitos. Main sincronizada em 1808b8617b809f3b1dc6f89ceae276019df44586; Issues #13/#14/#15 fechadas automaticamente. Branches anteriores preservadas.

## Decisões e entrega

- PublicJobsHttp compartilha limites e classificação de falhas, com defesa de hosts/caminhos fixos. Greenhouse preserva o comportamento anterior. Registry fornece adapters por plataforma; SyncService mantém o contrato/transação/idempotência.
- Ashby usa URL oficial canônica e SHA-256; ID presente na amostra mas não documentado não muda a política aprovada. isListed=false é persistido e ocultado na busca. Duplicatas conflitantes preservam false. [Conectores](connectors.md).
- Lever GLOBAL/EU, mode=json, páginas de 100, máximo 100 páginas, deduplicação e falha explícita se a coleta exceder o limite. Datas/modalidades não inferidas.
- Migração aditiva Job.isListed default true; nenhum dado removido. Seed inclui Ashby/Ashby verificado e continua idempotente/preservando enabled.
- Detalhes incluem texto, opcionais, status honesto e link validado. Consultas paginadas de empresas/fontes/execuções distinguem última tentativa de último sucesso. RUNNING antigo não é reclassificado; mensagens internas não são publicadas.
- UI responsiva com loading/vazio/erro/retry, filtros/URL, teclado e links internos/externos. Não há CRUD, autenticação, agendamento ou endpoint público de coleta.
- [ADR-009](decisions/ADR-009-visibilidade-e-consultas.md), AC-12/13 e documentos de operação detalham as decisões sem alterar requirements.md.

## Homologação real — 11/10/2026

Banco conferido antes das escritas: PostgreSQL 17.11 Trixie, internradar em 127.0.0.1:15432, usuário internradar, cluster 7695294238191448103. Snapshot inicial: 150 vagas Figma, duas fontes e migração inicial aplicada. Migração aditiva e seed executados somente após essa verificação.

Consulta preventiva Ashby/Ashby às 08:23:48 UTC: HTTP 200, 68 anúncios. Board oficial documentado; nenhum contorno de 403, autenticação ou scraping. Não foi possível comprovar a causa histórica das recusas de outros identificadores. A pendência de board Ashby verificável foi resolvida para este identificador.

`pnpm sync:jobs --concurrency 1`, uma execução global real após os testes de integração:

| Plataforma / board | Horário UTC | Recebidos/aceitos | Criados | Atualizados | Rejeitados/ignorados | Resultado |
| ------------------ | ----------- | ----------------- | ------- | ----------- | -------------------- | --------- |
| Ashby / Ashby      | 08:38:42–43 | 68                | 68      | 0           | 0                    | SUCCESS   |
| Lever / spotify    | 08:38:43–45 | 85                | 85      | 0           | 0                    | SUCCESS   |
| Greenhouse / figma | 08:38:45–46 | 150               | 0       | 150         | 0                    | SUCCESS   |

Uma tentativa HTTP por fonte nessa amostra; Lever coube na primeira página. Zero avisos. Total: **303 anúncios reais**; 68 datas de publicação Ashby informadas, Greenhouse/Lever continuam null. Não se presume que sejam estágios ou oportunidades brasileiras.

Conferência SQL comparou todos os 150 IDs/externalIds/firstSeenAt da Figma com o snapshot: preservados, lastSeenAt avançado. Nenhuma coleta repetida apenas para comprovar idempotência; essa propriedade foi testada com fixtures/SQL isolado. SyncRuns reais 9100c067-885e-440c-bf71-565f70f8fd61 (Ashby), 4c9c80f3-83cc-45bc-b815-311b94678eca (Lever) e 145cb009-ad92-4394-9a13-cdbe107736fd (Greenhouse).

Chromium e Firefox abriram localhost:3000, consultaram os três filtros de plataforma, navegaram aos detalhes e conferiram título/ID/link com a API real. /sources exibiu três fontes com SUCCESS e /sync-runs cinco execuções (duas anteriores e três novas). Zero erros de JavaScript; histórico sem overflow a 375px. Screenshots locais revisados, sem fixtures apresentadas como vagas reais.

## Checks locais

Instalação congelada com peers estritos, client gerado, lint, Prettier, TypeScript strict e builds aprovados. Sem novas dependências; versões e lockfile preservados. **140 testes**: 62 unitários (três conectores offline), 2 saúde HTTP, 34 integração PostgreSQL/HTTP e 42 Playwright (21 por navegador, incluindo bancos vazios reais).

Integração valida os três adapters reais com transporte fixture, sincronização global, idempotência, unlisting/relisting, falha independente, detalhes/400/404, filtros/paginação, opcionais e códigos históricos sanitizados. Regressão da Sprint 1 preservada, inclusive rollback/finalização/concorrência SQL.

A primeira execução browser detectou uma falha de foco no Firefox após o atalho de conteúdo do histórico. Destinos main tornados focáveis e teste passou a aguardar o foco antes do próximo Tab. A suíte completa passou após a correção, sem retries para esconder falhas. Inclui descrição legada semelhante a HTML renderizada como texto, sem execução, além de 375px sem overflow.

Schemas novos de testes permanecem preservados: jobs_5121dacf3faf485b96d9badc81118e06, jobs_019a15bbf7b34ddf992a91bb87433d89 e schemas browser_b5454c261b2540b8bc6ce97e3611f1df / browser_4eb123b951e44363846c3ce799911a40 (inicial/correção). O schema de regressão de persistência e todos os anteriores também permanecem. Nenhum volume, container, imagem, rede ou schema foi removido. Docker saudável, C: aproximadamente 14 GiB livres ao fim dos testes.

## Publicação e próximas entregas

A pipeline foi ampliada pelos mesmos scripts, sem chamadas externas obrigatórias. O PR e o resultado da CI serão vinculados após execução remota; publicação de YAML sozinha não comprova homologação.

- S2-04: resiliência operacional ampliada, políticas globais entre processos e diagnóstico. Nenhuma fila/Redis/scheduler antecipados.
- S2-05: revisão final do MVP e benchmark RNF-009 (10.000 vagas/100 consultas), ainda não executado. Licença/hospedagem continuam decisões separadas.
- Disponibilidade das APIs externas pode variar; URL permanente Ashby alterada pode gerar uma nova identidade. Não há inferência de fechamento por ausência.
- Merge deste lote depende de autorização específica do responsável.
