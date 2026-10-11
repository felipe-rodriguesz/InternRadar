# ADR-003 — Integração por APIs públicas

Status: aceito para o MVP; Greenhouse implementado em S1-02; demais adapters nas próximas entregas. Referências: RF-004–012; RNF-002/007/008/014/019; seção 7.

## Contexto

Greenhouse, Ashby e Lever possuem contratos diferentes, dados opcionais e falhas de transporte. O projeto precisa preservar a origem e não inventar informações.

## Decisão

Criar um conector por plataforma, com contrato comum e separação entre consulta, validação, normalização e persistência. Somente APIs públicas autorizadas, endpoints fixos e fontes cadastradas serão usados. A sincronização do MVP será manual; frontend não consultará plataformas externas diretamente.

## Justificativa

Adapters isolam mudanças externas e permitem fixtures de sucesso, vazio e erro. Uma normalização comum mantém a API de consulta independente de cada plataforma.

## Consequências

- Timeout/retries limitados e concorrência configurável seguirão a seção 7.4.
- Ausências serão `null`/`UNKNOWN`; desaparecimento de anúncio não fechará automaticamente a vaga.
- Greenhouse/Lever usarão IDs da origem. Ashby terá identidade determinística por URL canônica quando não houver ID confiável, conforme a especificação.
- Conteúdo externo será sanitizado; o backend não acessará URLs arbitrárias fornecidas nos anúncios.
- CI usará fixtures identificadas; testes reais de fontes serão documentados separadamente.
- Scheduler, alertas, scraping, login externo e candidaturas automáticas ficam fora do MVP.

## Alternativas consideradas

Scraping e APIs privadas introduziriam restrições e instabilidade. Consultas diretas do navegador acoplariam a interface às plataformas e impediriam persistência central. Um coletor genérico ocultaria diferenças importantes dos contratos.

Este ADR não inclui conectores ou consultas externas executáveis na S0-02/S0-03.

S1-01/S1-02: [ADR-004](ADR-004-contrato-dos-conectores.md) detalha o contrato implementado, resultado de coleta e limites. A consulta Greenhouse foi comprovada sem persistência; sincronização continua fora deste lote.
