# ADR-005 — Datas, status e consistência da sincronização

Status: aceito no escopo S1-03/S1-04/S1-05. Referências: seções 3, 6.2 e 8 da especificação v1.0; RN-003–010/013/017/018; HU-06/09/11.

## Contexto

Uma coleta pode omitir campos ou anúncios, falhar integralmente, ser interrompida ou concorrer com outra execução. Datas locais não comprovam publicação nem encerramento na origem.

## Decisão

- Identidade é `(jobSourceId, externalId)`. Não fundir anúncios de fontes distintas.
- Criar firstSeenAt ao identificar pela primeira vez; nunca atualizar. A proteção SQL existente continua ativa. lastSeenAt recebe o instante da resposta validada somente para itens efetivamente gravados. Uma resposta anterior à última observação armazenada é ignorada, sem regredir conteúdo/datas.
- Opcionais refletem a resposta atual validada: ausência limpa o campo para null/UNKNOWN. publishedAt não é inferido; Greenhouse continua sem data de publicação comprovada. A UI rotula firstSeenAt como “Identificada pelo InternRadar”.
- Novos registros começam ACTIVE. Upsert preserva status existente. Ausência, lista vazia ou erro não fecha nem remove vagas; ACTIVE não garante candidaturas abertas.
- SyncRun RUNNING é gravado antes do conector. HTTP/normalização ocorrem fora da transação. Depois, SELECT FOR UPDATE na fonte serializa a persistência entre processos; upserts e finalização SUCCESS são atômicos. A constraint única protege a identidade também no banco.
- Em falha, rollback desfaz todo o lote; finalização FAILED acontece separadamente, com código/mensagem estáticos sanitizados. Contadores de criação/atualização revertidos permanecem zero. Se nem a finalização puder ser gravada, CLI falha e RUNNING fica preservado como execução incompleta.
- Não reclassificar automaticamente RUNNING ao reiniciar: outro processo pode estar ativo. Inspecionar antes de qualquer intervenção; nova execução idempotente não apaga a evidência antiga.

## Justificativa

Preserva a semântica aprovada e diferencia ausência de evidência de evidência de encerramento. Serializar somente as escritas permite HTTP concorrente sem manter locks/transações durante a espera externa. O mesmo commit de banco confirma anúncios e contadores; falhas não geram sucesso artificial.

## Consequências

Duas coletas da mesma fonte podem consultar a origem; a gravação é serializada e não duplica registros. O lote global limita a duas fontes por processo, reduzível para uma. Não há exclusão distribuída das requisições entre CLIs independentes; limites operacionais globais mais amplos ficam para S2-04. Contenção/timeout de persistência resulta em FAILED e permite nova tentativa manual.

received/fetched inclui rejeitados; accepted é o conjunto válido/único após validação do contrato; skipped inclui rejeitados, duplicados da mesma resposta e observações antigas. updated conta anúncios reencontrados, mesmo sem mudança textual. Rejeições/avisos do conector são logados por índice/código, sem payload completo.

## Alternativas consideradas

Inferir publishedAt da coleta ou fechar por ausência violaria regras do MVP. Transação envolvendo HTTP ampliaria locks e risco de timeout. Apenas consultar antes de inserir, sem lock/constraint, tornaria contagens incorretas sob concorrência. Redis/filas e limpeza automática de execuções incompletas acrescentariam infraestrutura e risco sem necessidade neste lote.

Referências: [locks PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html), [transações Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions), [operação](../synchronization.md).

S2-01: visibilidade isListed é independente de status. False explícito oculta busca; ausência de anúncio continua sem transição automática. Ashby publishedAt representa a última publicação informada pela origem; Lever createdAt continua sem equivalência comprovada e não é usado como publicação.
