# Sincronizar e consultar vagas

S1-03/S1-04/S1-05: RF-009–015/017, HU-06/07/09/10/11, TA-02/03/06/07/09/10/11. Detalhes e histórico visual por fonte ficam para S2-02/S2-03. [ADR-005](decisions/ADR-005-politica-de-datas-e-status.md) consolida datas/status e concorrência.

## CLI local

Prepare `.env`, banco, migrações e seed conforme README. Confirme o destino privado antes de coletar: banco/porta/usuário corretos, digest Trixie e migração aplicada. Nenhum endpoint HTTP inicia sincronizações.

```sh
pnpm sync:jobs --list
pnpm sync:jobs --source UUID_DA_FONTE
pnpm sync:jobs
pnpm sync:jobs --concurrency 1
```

`--list` mostra somente IDs, empresa, plataforma, board e enabled. `--source` exige UUID; fonte inexistente falha e desativada retorna SKIPPED sem iniciar SyncRun. Sem source, seleciona todas as habilitadas, no máximo duas em paralelo por processo. `--concurrency 1` reduz o limite; argumentos inválidos não iniciam a coleta.

O seed contém Figma/Greenhouse e Spotify/Lever. **Neste lote somente Greenhouse é implementado.** A execução global registra FAILED/UNSUPPORTED_PLATFORM para Lever, continua as outras fontes e retorna exit code 1. Não desativamos silenciosamente a fonte nem simulamos seu sucesso. Para a demonstração, use o UUID Greenhouse retornado por `--list`.

A saída é JSON estruturado por execução: source/jobSourceId, status, horários, duração, contagens, rejeições/avisos seguros e erro classificado. SUCCESS significa que a gravação e a finalização foram confirmadas no PostgreSQL. Uma única fonte com FAILED torna o comando malsucedido, sem desfazer fontes que tiveram sucesso.

## Consistência e diagnóstico

SyncModule existe apenas no contexto CLI; ConnectorsModule consulta/normaliza, SyncService valida o contrato e persiste. O lote por fonte é atômico. fetchedCount inclui todos os itens recebidos; created/updated refletem gravações confirmadas; skipped inclui rejeições, duplicatas e observações antigas. Falha SQL real é testada por trigger exclusivamente no schema de teste, com rollback integral.

O registro RUNNING precede a chamada externa. Interrupção abrupta ou indisponibilidade ao finalizar pode preservá-lo sem finishedAt; isso **não é sucesso**. O CLI retorna FINALIZATION_FAILED quando detecta a falha. Para inspecionar, use SQL local somente leitura:

```sql
SELECT "id", "jobSourceId", "startedAt", "finishedAt", "status",
       "fetchedCount", "createdCount", "updatedCount", "skippedCount", "errorCode"
FROM "SyncRun" ORDER BY "startedAt" DESC;
```

Não há cancelamento/expiração automática, reclassificação retroativa ou exclusão. Verifique se o processo ainda está ativo; uma nova sincronização cria outra tentativa auditável. Não encerre/anule registros anteriores sem procedimento revisado. Payloads externos, SQL, stacks e credenciais não são salvos nas mensagens de erro.

## GET /api/v1/jobs

```sh
curl --fail 'http://localhost:3001/api/v1/jobs?page=1&pageSize=20'
curl --fail 'http://localhost:3001/api/v1/jobs?q=intern&platform=GREENHOUSE'
curl --fail 'http://localhost:3001/api/v1/jobs?location=Brasil&workplaceType=REMOTE'
```

Retorna `{items, page, pageSize, total}`. Itens incluem id/title, company{id,name}, source{id,platform}, location/workplaceType/employmentType, jobUrl, publishedAt/firstSeenAt/lastSeenAt e status. Descrição participa da pesquisa, mas não é transferida integralmente na listagem. Nenhuma credencial, board interno, payload bruto ou mensagem de sincronização é exposta.

| Parâmetro     | Regra                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| q             | Substring literal em título/descrição, case-insensitive, até 200 caracteres |
| platform      | GREENHOUSE, ASHBY, LEVER                                                    |
| sourceId      | UUID válido; inexistente retorna lista vazia                                |
| workplaceType | REMOTE, HYBRID, ONSITE, UNKNOWN                                             |
| location      | Substring literal case-insensitive, até 100 caracteres                      |
| page          | Inteiro >= 1, padrão 1; deslocamento máximo 2147483647                      |
| pageSize      | Inteiro 1..100, padrão 20                                                   |

Trim/NFC são aplicados uniformemente. Filtro vazio é ignorado; arrays/repetições e valores inválidos retornam 400 `{statusCode, code: "INVALID_QUERY", message}` sem ecoar conteúdo arbitrário. Caracteres `%`, `_` e barra inversa são escapados como texto, não curingas SQL. Filtros combinam por AND; q combina título/descrição por OR dentro desse conjunto.

Ordenação firstSeenAt DESC, id DESC. Itens e total usam uma transação RepeatableRead para o mesmo snapshot. Projeções/relações Prisma são limitadas à página, sem consulta individual por anúncio. Offset é determinístico com base estável; novas sincronizações entre requisições podem deslocar páginas, limitação natural desse contrato. Respostas têm Cache-Control: no-store.

Link legado que viole a política retorna jobUrl=null; a UI mantém o anúncio e mostra “Link original indisponível”. O frontend valida novamente e nunca renderiza HTML. Ausências de localização/modalidade/publicação são explícitas. Não há inferência de estágio, Brasil ou disponibilidade atual.

## Navegador

Acesse `/`, escolha **Buscar oportunidades**, ou abra `/jobs`. Envie busca/filtros pelo formulário; a URL permite compartilhar a pesquisa, recarregar e voltar/avançar. Paginação preserva os filtros. Uma nova busca volta à primeira página. API indisponível não vira lista vazia; a interface oferece nova tentativa. Saúde continua disponível em `/`.

## Testes e limites

```sh
pnpm test:unit
pnpm --filter @internradar/api test:http
pnpm test:integration
pnpm --filter @internradar/web test
```

Integração usa PostgreSQL separado: migração nova, SyncService/Prisma reais e HTTP NestJS. Cobertura inclui falhas SQL/finalização reais, idempotência, limite de concorrência, lastSeenAt, fonte desativada, dados parciais, filtros/ordenação e links legados.

O runner de browsers cria um schema novo após validar identidade do cluster, testa vazio real nos dois browsers, alimenta 23 fixtures sintéticas por SyncService e executa listagem/filtros/paginação. API/web usam builds e servidores próprios; banco diário não é alterado. Não há dependência Greenhouse nesses testes. Interceptações são usadas apenas para estados de falha visual. Cada execução preserva schemas; não repita sem necessidade e não limpe recursos automaticamente.

S2-01 adicionará Ashby/Lever no mesmo contrato; S2-02 detalhe; S2-03 fontes/histórico; S2-04 políticas mais amplas de resiliência; S2-05 completa homologação, incluindo benchmark RNF-009 de 10 mil anúncios. Esse benchmark ainda não foi executado.
