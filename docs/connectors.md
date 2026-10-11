# Conectores e Greenhouse

Escopo S1-01/S1-02: RF-004/007/008, HU-03/HU-11, RN-006/007/011/012/013/015, TA-03 e parte de TA-09/TA-11. S1-03 agora consome esses contratos por SyncService; o conector continua sem acesso ao banco.

## Contrato e responsabilidades

`apps/api/src/connectors/contracts.ts` define JobConnector, JobSourceConfig, NormalizedJob e CollectionResult. Região é obrigatória no tipo; a validação de entrada aplica GLOBAL se ausente, conforme AC-03. Tipos de plataforma/região/modalidade independem do Prisma e do frontend.

`fetchJobs` retorna jobs, rejeições (índice/ID seguro/código), avisos, contagens recebidas/aceitas/rejeitadas e tentativas HTTP. Em falha integral lança IntegrationError: nunca converte erro em lista vazia. Uma lista vazia válida retorna contagens zero; itens inválidos afetam somente suas próprias posições. SyncService converte esses resultados em logs/SyncRun e persistência, validando o contrato normalizado sem reinterpretar o payload externo.

```text
JobSourceConfig validada
  → GreenhouseHttp: URL fixa, GET, timeout/retry, leitura limitada e JSON
  → greenhouse-normalizer: envelope/itens, extração e mapeamento
  → normalization: texto seguro, URL e utilitário de data opcional
  → CollectionResult: anúncios + rejeições/avisos, sem escrita no banco
```

ConnectorsModule exporta GreenhouseConnector por provider NestJS; nenhuma requisição acontece na inicialização da API. Outros adapters implementarão o mesmo contrato, sem alterar a futura listagem. Não há registry/factory genérica, scheduler ou abstração de paginação antecipada.

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

Greenhouse retorna uma listagem, sem paginação. SyncService limita o lote a duas fontes por processo (opção de uma), registra auditoria e serializa gravações por fonte. Adapters paginados e controles operacionais mais amplos permanecem para Sprint 2.

## Testes e demonstração

```sh
pnpm test:unit
pnpm greenhouse:check figma
```

O primeiro comando é offline e não requer banco. Fixtures sintéticas versionadas cobrem sucesso, opcionais, vazio, mistura inválida, URLs, HTML perigoso, datas ausentes e falhas HTTP/timeout/JSON. Fetch, sleep, jitter e relógio são controlados; o timeout testa aborto real do sinal com timers simulados.

O segundo faz consulta pública real e imprime somente diagnóstico/contagens. Não carrega `.env`, importa Prisma ou escreve no banco. Board inválido/falha retorna exit code diferente de zero. Não executar esse comando no CI como substituto de fixtures.

**Evidência real:** `pnpm greenhouse:check figma`, 11/10/2026 às 07:15:41 UTC: 150 recebidos, 150 aceitos, zero rejeitados/avisos, uma tentativa, 608 ms. Datas de publicação e modalidades não foram inventadas (zero conhecidas). Esses anúncios não foram filtrados como estágios nem gravados. Disponibilidade futura da fonte não é garantida.

## Persistência e consumo na interface

[SyncService](synchronization.md) reutiliza JobConnector/CollectionResult, sem duplicar transporte ou mapeamento. CLI seleciona fontes habilitadas; JobsModule e Next.js leem apenas o resultado persistido. Novos adapters implementarão o contrato e serão registrados no serviço; a API pública e a interface não precisam conhecer payloads externos.
