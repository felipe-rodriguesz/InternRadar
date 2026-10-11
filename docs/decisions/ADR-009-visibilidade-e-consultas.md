# ADR-009 — Visibilidade na origem e consultas de acompanhamento

Status: implementado no lote autorizado S2-01/S2-02/S2-03; sujeito à revisão do PR. Referências: HU-04/05/08/09, seções 7.3, 9 e 10; AC-12/13.

## Contexto

Ashby pode informar isListed=false inclusive para uma vaga previamente coletada. Apenas descartar esse item manteria a cópia anterior aparecendo na busca. O acompanhamento também precisa distinguir falha recente de sucesso passado e execuções sem conclusão.

## Decisão

Acrescentar Job.isListed com default true por migração aditiva. NormalizedJob aceita visibilidade opcional (ausência default true para adapters existentes); Ashby fornece booleano validado. Upsert atualiza visibilidade junto do conteúdo, preservando identidade/firstSeenAt/status. Busca padrão exige true. Detalhe por UUID permite leitura com aviso, conforme semântica pública de acesso por link direto. Não há mudança automática de status por ausência.

CatalogModule expõe consultas paginadas de empresas/fontes/execuções. Projeta somente campos públicos. Fonte inclui latestRun (startedAt DESC/id DESC) e lastSuccessfulAt (maior finishedAt de SUCCESS); nunca se presume sucesso de RUNNING. Duração só existe quando a execução não está RUNNING e a conclusão é posterior ou igual ao início. Histórico não é reclassificado. Códigos de erro passam por allowlist; mensagens internas não são publicadas.

Total e itens usam snapshot RepeatableRead. Fontes carregam relações paginadas e duas projeções limitadas para última tentativa/último sucesso, sem ler todo o histórico e sem consulta por fonte no código. Não há rotas de escrita ou coleta pública.

## Justificativas

Representar visibilidade separadamente mantém a política original de status/datas. Contratos de leitura pequenos sustentam UI e diagnóstico sem acoplar consultas aos conectores. Nenhuma credencial ou payload externo bruto integra as respostas.

## Consequências

Uma migração aditiva deve ser aplicada antes de executar o código novo; dados existentes recebem true. isListed não comprova disponibilidade de candidatura. URL permanente alterada no Ashby pode gerar nova identidade; não há deduplicação heurística entre publicações. Históricos preservados podem crescer; retenção e benchmark ficam para entregas posteriores.

## Alternativas consideradas

Descartar isListed=false não ocultaria anúncios antigos. Converter para CLOSED confundiria visibilidade e disponibilidade. Remover dados perderia auditoria. Carregar todas as execuções para a UI ou fazer uma consulta por fonte ampliaria custo desnecessariamente. Login/CRUD e endpoints de sincronização seguem fora do escopo.
