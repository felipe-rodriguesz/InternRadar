# Sprint 1 — Primeiro conector vertical

Referência: especificação v1.0, seção 13.2. [Milestone](https://github.com/felipe-rodriguesz/InternRadar/milestone/2). S1-01/S1-02 integradas. Lote atual S1-03/S1-04/S1-05 na branch feat/s1-03-04-05-sync-jobs-web.

| Entrega | Issue                                                             | Estado                                                             |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| S1-01   | [#10](https://github.com/felipe-rodriguesz/InternRadar/issues/10) | Contratos, normalização e testes implementados                     |
| S1-02   | [#11](https://github.com/felipe-rodriguesz/InternRadar/issues/11) | Greenhouse implementado; consulta Figma real aprovada              |
| S1-03   | [#13](https://github.com/felipe-rodriguesz/InternRadar/issues/13) | Sincronização transacional, CLI e auditoria implementadas/testadas |
| S1-04   | [#14](https://github.com/felipe-rodriguesz/InternRadar/issues/14) | GET /jobs, filtros e paginação implementados/testados              |
| S1-05   | [#15](https://github.com/felipe-rodriguesz/InternRadar/issues/15) | Interface real, estados e browsers implementados/testados          |

## Evidências do lote — 11/10/2026

PR #8 integrado por rebase após conferir HEAD 73c98ca57f07c0b6204b2b2e253d7a5871073ab6, árvore limpa e ausência de conflitos/checks com falha. Main sincronizada em 200298c8b0409eb019579665f06f8f4dacf76b36; Issues #6/#7 fechadas automaticamente. Branches antigas preservadas.

35 testes unitários aprovados inicialmente (2 ambiente, 5 normalização compartilhada e 28 Greenhouse): fixtures, erros, redirects, retries/Retry-After, timeout por sinal abortado e limite de corpo. Dependências htmlparser2 12.0.0 / entities 8.1.0 verificadas e fixadas no pacote API; Node/pnpm/TypeScript/Prisma/PostgreSQL preservados. Lint, instalação congelada com peers estritos, typecheck e builds aprovados.

Consulta real `pnpm greenhouse:check figma`: 150 anúncios recebidos/aceitos, zero rejeições/avisos, uma tentativa às 07:15:41 UTC; nada persistido, sem inferir publicação/modalidade. [Contrato, limites e evidências](connectors.md). Testes de CI não fazem essa chamada externa.

Regressão local: `pnpm test` aprovou os 35 unitários, 2 HTTP e 8 testes Playwright. `pnpm test:integration` aprovou 8 testes reais no schema novo `check_590f6fec96f84410b48d8604c0af0ac1`, preservado no cluster separado. Inventário Docker idêntico ao início do lote (8 containers, 7 volumes, 12 redes), sem novos erros de I/O. Nenhum dado anterior removido.

Revisão de 98 arquivos candidatos: especificação idêntica ao original por bytes/SHA-256, Compose/digest/schema/strict base preservados, nenhuma credencial local ou padrão de chave/token encontrado. JSON/YAML/LF, configuração de CI, workspaces e whitespace aprovados.

CI homologada no [run 38121178306](https://github.com/felipe-rodriguesz/InternRadar/actions/runs/38121178306), HEAD `4137084`, com todos os passos aprovados: instalação limpa, qualidade/builds, migração/seed e 53 testes (35 unitários, 2 HTTP, 8 persistência, 8 browsers). O [PR #12](https://github.com/felipe-rodriguesz/InternRadar/pull/12) mantém os Checks do último commit; merge depende de autorização. Issues #9/#10/#11 atualizadas, sem criar Issues das entregas seguintes.

## Lote S1-03/S1-04/S1-05 — 11/10/2026

PR #12 integrado por **rebase** em 07:39:35 UTC após conferir HEAD f361c788ce24fae7e8959988a52154ca46bff0df e [CI aprovada no mesmo commit](https://github.com/felipe-rodriguesz/InternRadar/actions/runs/38121387809). Issues #9/#10/#11 fechadas automaticamente; main local/remota em b31ff57abdcaea90bb94c47d12c2fa104fcdd904. Árvore inicial limpa e branches anteriores preservadas.

- SyncModule/CLI: seleção por UUID ou todas habilitadas; no máximo duas por processo; validação de CollectionResult; lock de fonte somente durante persistência; upsert e SUCCESS atômicos. Mensagens de falha sanitizadas; rollback preserva dados e RUNNING incompleto não vira sucesso. Não há rota administrativa.
- JobsModule: GET /api/v1/jobs, busca/filtros AND, limites e erro 400 útil, ordenação firstSeenAt DESC/id DESC, total/items sob RepeatableRead, relações projetadas e link inválido oculto.
- Next.js: /jobs, filtros/URL/histórico, cards/paginação, opcionais honestos e link externo; / mantém saúde e acesso à listagem. Estados vazio real, filtros sem resultado, loading, conexão/backend e retry. Teclado e 375px sem overflow nos dois browsers.
- Nenhuma dependência nova, migração ou alteração do digest. [ADR-005](decisions/ADR-005-politica-de-datas-e-status.md) e [operação](synchronization.md) registram as decisões.

### Demonstração real

Destino conferido: PostgreSQL 17.11 Trixie, internradar em 127.0.0.1:15432, usuário autenticado internradar, schema public atualizado e fonte Figma habilitada. Antes da coleta havia zero vagas.

| Execução UTC      | Recebidos | Aceitos | Criados | Atualizados | Rejeitados/ignorados | Resultado |
| ----------------- | --------- | ------- | ------- | ----------- | -------------------- | --------- |
| 07:48:12–07:48:14 | 150       | 150     | 150     | 0           | 0                    | SUCCESS   |
| 07:57:12–07:57:13 | 150       | 150     | 0       | 150         | 0                    | SUCCESS   |

SQL/Prisma comprovaram 150 IDs únicos, firstSeenAt idêntico após repetição e lastSeenAt avançado em todos. Os dois SyncRuns foram persistidos. Todos mantêm publishedAt=null e modalidade UNKNOWN. API retornou total=150, com título/ID/empresa conferidos contra o banco.

Chromium e Firefox abriram localhost:3000, navegaram para /jobs e pesquisaram `intern`: 117 correspondências textuais nessa amostra. Isso **não significa 117 estágios**: a busca inclui descrições e substrings como “international”. Não houve filtro/invenção de vagas brasileiras. Zero erros de console e ausência de overflow móvel. Screenshots locais revisados; não são dados de fixture apresentados como coleta real.

### Checks locais

Instalação congelada com peers estritos, Prisma gerado, lint, strict e builds aprovados. **84 testes**: 37 unitários, 2 saúde HTTP, 23 persistência/sincronização/HTTP jobs e 22 Playwright (11 por browser, incluindo vazio real). Suíte antiga preservada. Falhas SQL e de finalização são reais e limitadas a triggers do schema novo; chamadas externas não são necessárias nos testes automatizados.

A inspeção visual detectou chaves React duplicadas entre formulário e resultados; corrigidas com namespaces distintos e regressão que garante formulário único após busca. A suíte browser completa passou novamente após a correção.

Schemas finais preservados: jobs_d40c856413394663802cee65431e07a9, check_cdff121181ee457facb89f0111abb8a3 e browser_a0b75c3f45e54d3dbe78d55d2da80a53. Os dois schemas da primeira validação também permanecem. Nenhum volume/container/rede antigo foi removido; os bancos diários permaneceram saudáveis. Disco C: aproximadamente 15 GiB livres durante os checks.

### Publicação

Issues #13/#14/#15 vinculadas ao Milestone Sprint 1. A pipeline foi ampliada e homologada no [run 38123375563](https://github.com/felipe-rodriguesz/InternRadar/actions/runs/38123375563), HEAD 3e700fa: todos os passos aprovados, 84 testes e encerramento dos serviços do runner. [PR #16](https://github.com/felipe-rodriguesz/InternRadar/pull/16) reúne os commits e os Checks do HEAD mais recente. Merge do novo lote depende de autorização específica.

## Pendências para Sprint 2

- S2-01: Ashby/Lever, board Ashby verificado e paginação Lever. A fonte Lever habilitada recebe UNSUPPORTED_PLATFORM no CLI global até implementação; os demais resultados são independentes.
- S2-02: detalhes /jobs/[id].
- S2-03: fontes e histórico na UI, incluindo visibilidade de execuções incompletas.
- S2-04: resiliência operacional ampliada e concorrência entre processos; sem Redis/agendamento antecipados.
- S2-05: homologação restante do MVP e benchmark RNF-009 (10 mil registros/100 consultas), ainda não executado.
- Nenhuma transição por ausência, favoritos, ranking, autenticação ou deploy público foi implementada.
