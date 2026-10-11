# Conectores públicos

Escopo S1-01/S1-02: RF-004/007/008, HU-03/HU-11, RN-006/007/011/012/013/015, TA-03 e parte de TA-09/TA-11. S1-03 agora consome esses contratos por SyncService; o conector continua sem acesso ao banco.

## Contrato e responsabilidades

`apps/api/src/connectors/contracts.ts` define JobConnector, JobSourceConfig, NormalizedJob e CollectionResult. Região é obrigatória no tipo; a validação de entrada aplica GLOBAL se ausente, conforme AC-03. Tipos de plataforma/região/modalidade independem do Prisma e do frontend.

`fetchJobs` retorna jobs, rejeições (índice/ID seguro/código), avisos, contagens recebidas/aceitas/rejeitadas e tentativas HTTP. Em falha integral lança IntegrationError: nunca converte erro em lista vazia. Uma lista vazia válida retorna contagens zero; itens inválidos afetam somente suas próprias posições. SyncService converte esses resultados em logs/SyncRun e persistência, validando o contrato normalizado sem reinterpretar o payload externo.

```text
JobSourceConfig validada
  → PublicJobsHttp: URL fixa, GET, timeout/retry, leitura limitada e JSON
  → greenhouse-normalizer: envelope/itens, extração e mapeamento
  → normalization: texto seguro, URL e utilitário de data opcional
  → CollectionResult: anúncios + rejeições/avisos, sem escrita no banco
```

ConnectorsModule exporta ConnectorRegistry com Greenhouse, Ashby e Lever registrados por plataforma. SyncService consulta o registro; nenhuma requisição acontece na inicialização da API. Novos adapters são adicionados ao registro sem alterar a persistência ou listagem. Não há scheduler nem framework de paginação genérico.

## Contrato público verificado

A [documentação oficial Greenhouse](https://docs.greenhouse.io/job-board.html), consultada em 11/10/2026, confirma GET público sem autenticação, `content=true`, `id` da publicação distinto de `internal_job_id`, descrição com entidades HTML e metadados customizados. A listagem não documenta uma data de publicação. `first_published` aparece no endpoint de detalhe; não fazemos requisições adicionais por anúncio.

| Normalizado    | Regra implementada                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| externalId     | id numérico inteiro positivo e seguro, convertido para string; nunca internal_job_id                                  |
| title          | Texto obrigatório, sem tags, espaços normalizados; vazio rejeitado                                                    |
| description    | content ausente/vazio vira null; HTML/entidades convertidos em texto                                                  |
| location       | location.name, quando presente; localidades múltiplas preservadas como texto                                          |
| workplaceType  | UNKNOWN; título/localidade contendo Remote não comprova modalidade                                                    |
| employmentType | Somente um metadado explicitamente chamado Employment Type, value_type=text, valor textual; ausente/ambíguo fica null |
| jobUrl         | absolute_url http(s) validada; pode usar domínio próprio de carreira; nunca acessada pelo servidor                    |
| publishedAt    | null: updated_at e campos extras não comprovados na listagem não viram publicação                                     |

A função compartilhada optionalDate exige ISO com timezone e distingue ausência de valor inválido; os próximos adapters poderão traduzir o aviso INVALID_DATE. Ela não é usada para reinterpretar updated_at no Greenhouse.

## Segurança e limites

- Board: 1–128 caracteres ASCII alfanuméricos, hífen ou underscore; sem host, barra, escapes, query ou espaços. Greenhouse aceita somente região GLOBAL; regiões/plataformas incompatíveis falham antes de rede.
- Host de consulta fixo `boards-api.greenhouse.io`; caminho `/v1/boards/{boardKey}/jobs?content=true`. Redirects não são seguidos. GET sem autenticação, User-Agent identifica InternRadar.
- Links de navegação não aceitam protocolos executáveis, credenciais, IP literal, host local/interno, caracteres de controle, porta não padrão ou domínio malformado. Não há resolução DNS nem acesso ao link. Permitir domínio corporativo no link não permite endpoints arbitrários ao coletor.
- htmlparser2 12.0.0 e entities 8.1.0 são dependências locais/exatas da API, compatíveis com Node >=20.19. O parser não cria DOM, executa scripts ou baixa recursos. Remove tags/atributos e subárvores script/style/iframe/object/svg/math/template; decodifica entidades e normaliza texto. Não usamos regex como parser HTML.
- O resultado é **texto**, nunca HTML confiável. Consumidores devem renderizá-lo como texto, sem dangerouslySetInnerHTML. Essa regra também vale para strings com sinais de comparação ou texto originalmente codificado.
- Corpo limitado a 8 MiB durante leitura, no máximo 10.000 itens. Título até 1.000 caracteres, descrição até 200.000, localização até 2.000 e link até 4.096. Descrição/localização inválidas tornam-se null com aviso; título/ID/link inválidos rejeitam o anúncio.
- Nenhum payload completo ou erro bruto de transporte entra nos detalhes públicos/logs do comando.

## Falhas e retries

Timeout de 10 segundos por tentativa, incluindo leitura do corpo; três tentativas totais no máximo. Timeout, rede, 429 e 5xx são transitórios. Espera exponencial de 500/1.000 ms + jitter de até 249 ms. Retry-After aceita segundos ou HTTP-date e prevalece quando maior.

Se Retry-After exceder 30 segundos, a chamada termina com `retryAfterExceeded=true`, sem repetir antes do prazo indicado. O operador recebe a classificação para nova execução posterior. JSON inválido, estrutura inesperada, corpo excessivo, redirects e 4xx definitivos não são repetidos.

Códigos: INVALID_SOURCE, RATE_LIMITED, UPSTREAM_SERVER_ERROR, BOARD_NOT_FOUND (404/410), BOARD_UNAVAILABLE (401/403), HTTP_ERROR, REDIRECT_NOT_ALLOWED, TIMEOUT, NETWORK_ERROR, INVALID_JSON, UNEXPECTED_RESPONSE e RESPONSE_TOO_LARGE. Rejeições individuais: INVALID_ITEM, INVALID_ID, EMPTY_TITLE e INVALID_JOB_URL.

Greenhouse retorna uma listagem, sem paginação. SyncService limita o lote a duas fontes por processo (opção de uma), registra auditoria e serializa gravações por fonte. Lever implementa paginação limitada; controles operacionais adicionais permanecem para S2-04.

## Testes e demonstração

```sh
pnpm test:unit
pnpm greenhouse:check figma
```

O primeiro comando é offline e não requer banco. Fixtures sintéticas versionadas cobrem sucesso, opcionais, vazio, mistura inválida, URLs, HTML perigoso, datas ausentes e falhas HTTP/timeout/JSON. Fetch, sleep, jitter e relógio são controlados; o timeout testa aborto real do sinal com timers simulados.

O segundo faz consulta pública real e imprime somente diagnóstico/contagens. Não carrega `.env`, importa Prisma ou escreve no banco. Board inválido/falha retorna exit code diferente de zero. Não executar esse comando no CI como substituto de fixtures.

**Evidência real:** `pnpm greenhouse:check figma`, 11/10/2026 às 07:15:41 UTC: 150 recebidos, 150 aceitos, zero rejeitados/avisos, uma tentativa, 608 ms. Datas de publicação e modalidades não foram inventadas (zero conhecidas). Esses anúncios não foram filtrados como estágios nem gravados. Disponibilidade futura da fonte não é garantida.

## Persistência e consumo na interface

[SyncService](synchronization.md) reutiliza JobConnector/CollectionResult, sem duplicar transporte ou mapeamento. CLI seleciona fontes habilitadas; JobsModule e Next.js leem apenas o resultado persistido. Novos adapters implementam o contrato e são registrados em ConnectorsModule; a API pública e a interface não precisam conhecer payloads externos.

## Ashby — S2-01

[API pública oficial](https://developers.ashbyhq.com/docs/public-job-posting-api), consultada em 11/10/2026: GET `https://api.ashbyhq.com/posting-api/job-board/{boardKey}`, região GLOBAL. O board **Ashby**, com essa capitalização, é apresentado pela própria documentação e respondeu HTTP 200 às 08:23:48 UTC, com 68 anúncios. A resposta tem um campo id, mas o contrato público ainda não o documenta: continuamos com a identidade aprovada por URL.

- `externalId = urlsha256:<SHA-256 da URL canônica>`. Aceitamos a URL oficial HTTPS `jobs.ashbyhq.com/{board}/{publicação}`: host normalizado, segmentos preservados (incluindo maiúsculas/minúsculas), barra final/query/fragmento removidos. Caminhos sem ID, segmentos extras e hosts customizados são rejeitados em vez de fundir publicações cuja identidade dependa da query. URLs distintas de publicação produzem IDs distintos. Alteração da URL permanente pode criar novo registro; não se presume equivalência.
- Título/localização/tipo de emprego são explícitos; descrição prefere descriptionPlain e usa descriptionHtml como fallback, ambos tratados como texto não confiável. workplaceType Remote/Hybrid/OnSite é mapeado diretamente; na ausência desse campo, isRemote=true comprova REMOTE. isRemote=false não comprova ONSITE. Demais casos ficam UNKNOWN.
- publishedAt é a **última publicação informada pela origem**, conforme a documentação; valor inválido vira null com aviso. Não é o momento de primeira identificação pelo InternRadar.
- isListed=false é persistido como visibilidade, sem excluir o registro nem alterar status. A busca padrão exclui esses registros; detalhes por ID explicam a não listagem. Uma nova resposta explícita true pode tornar a vaga visível novamente. Campo ausente mantém compatibilidade com os outros adapters por padrão true.
- Migração aditiva `20261011083000_job_visibility`: acrescenta Job.isListed, default true, sem alterar IDs/datas dos anúncios existentes. [ADR-009](decisions/ADR-009-visibilidade-e-consultas.md).

**403 anterior:** consultas de S0-05 a notion/ashby registraram 403. A consulta atual ao identificador oficial `Ashby` funcionou sem autenticação, proxy alternativo, scraping ou contorno de restrição. Não há evidência suficiente para atribuir a causa histórica a uma mudança específica do provedor. 401/403 continuam BOARD_UNAVAILABLE, sem retry. Nenhum sucesso foi inventado para os boards anteriormente recusados.

## Lever — S2-01

[Contrato oficial](https://github.com/lever/postings-api), consultado em 11/10/2026. GET `https://api.lever.co/v0/postings/{boardKey}?mode=json&skip=0&limit=100`; região EU usa exclusivamente `api.eu.lever.co`. Não há fallback entre regiões.

ID oficial textual; text → título; categories.location/commitment → localização/vínculo. descriptionPlain/description, listas e additionalPlain/additional compõem descrição textual sanitizada. workplaceType remote/hybrid/on-site é explícito; unspecified/ausente fica UNKNOWN. hostedUrl é validada. createdAt não é documentado como publicação nesse contrato e não é usado: publishedAt permanece null.

Páginas sequenciais de 100; skip avança pelo tamanho solicitado, mesmo quando há itens rejeitados/duplicados. Página menor que 100, incluindo vazia, conclui. IDs repetidos são rejeitados com DUPLICATE_EXTERNAL_ID, preservando o primeiro item válido. Máximo de 100 páginas: se a última ainda estiver cheia, falha PAGINATION_LIMIT, **sem sucesso parcial**. Não se persiste lote incompleto. Cada página reutiliza os limites de HTTP descritos acima; attempts no resultado é a soma das tentativas (até 300), não um novo limite de retries por requisição.

Os limites de 8 MiB/corpo e 10.000 itens/coleta continuam. O registry não muda as transações, idempotência ou proteção contra concorrência da sincronização. Falha de uma plataforma não impede os outros resultados globais. Fixtures Ashby/Lever são sintéticas, versionadas; a CI nunca chama APIs externas. Evidências da sincronização real: [Sprint 2](sprint-2.md).
