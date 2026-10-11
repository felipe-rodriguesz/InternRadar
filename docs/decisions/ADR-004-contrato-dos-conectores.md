# ADR-004 — Contratos dos conectores e normalização segura

Status: aceito no escopo S1-01/S1-02. Referências: seção 7, RF-004/007/008, RNF-002/007/008/014/019.

## Contexto

O primeiro adapter deve tratar dados não confiáveis e falhas da origem, mantendo integração independente do Prisma, da futura sincronização e da listagem.

## Decisão

JobConnector.fetchJobs recebe JobSourceConfig validada e retorna CollectionResult com NormalizedJob[], rejeições por índice/ID seguro, avisos, contagens e tentativas. Falhas integrais lançam IntegrationError classificado. Tipos de plataforma/região não dependem de código Prisma gerado; região validada usa GLOBAL por padrão.

GreenhouseHttp concentra endpoint fixo, GET sem redirects, limites, timeout e retry. Normalização usa envelope/itens validados, funções de texto/URL e regras específicas do adapter. htmlparser2/ entities fazem conversão para texto sem DOM. Nenhum conector persiste dados ou executa sincronização.

## Justificativa

Resultado detalhado diferencia vazio válido, rejeição parcial e falha integral; permite que S1-03 registre totais sem reinterpretar payload externo. Testes injetam transporte/relógio, sem internet e sem mascarar a consulta real usada na demonstração. Parser mantido evita sanitização por regex.

## Consequências

- Adicionar outro adapter implementa a mesma interface; campos normalizados mantêm semântica independente da plataforma.
- Texto deve ser renderizado como texto, nunca HTML confiável. URLs dos anúncios servem somente à navegação; não viram endpoints do coletor.
- Greenhouse mantém publishedAt null; updated_at não é publicação. Modalidade UNKNOWN, sem inferência por palavras do título/localidade.
- Metadado Employment Type só é usado quando explicitamente identificado e textual; dados ambíguos continuam desconhecidos.
- Retry-After acima de 30s encerra sem nova tentativa precoce. Concorrência entre fontes e paginação permanecem nas entregas futuras pertinentes.
- Payload bruto não integra os resultados/logs; política e limites detalhados em [connectors.md](../connectors.md).

## Alternativas consideradas

Retornar somente array perderia motivos e contagens. Acoplar ao Prisma dificultaria testes offline e misturaria consulta com persistência. Um framework genérico de coletores/paginação seria prematuro para uma API. Regex para HTML não é um parser seguro; DOM completo adicionaria execução/capacidades desnecessárias.
