# Fixtures Greenhouse

Dados sintéticos identificados, produzidos para testes; nenhuma fixture representa uma coleta real ou uma oportunidade disponível. IDs, board fixture e textos são exemplos. O formato segue a documentação pública [Job Board API](https://docs.greenhouse.io/job-board.html), consultada em 11/10/2026.

- valid: estrutura com content codificado, localidade completa, ID da publicação diferente do cargo e metadado explícito.
- optional-missing / empty: ausência de opcionais e lista vazia válida.
- mixed-invalid / invalid-urls / unsafe-html: rejeições e sanitização sem executar conteúdo.
- publication-missing: updated_at e campos extras não documentados na listagem não viram publishedAt.
- http-429 / http-500 / http-timeout: transporte simulado, incluindo espera/aborto; relógio controlado no teste.
- malformed-json.txt: JSON intencionalmente incompleto.

Testes usam Response/fetch injetado e timers controlados; não acessam a internet. A verificação real fica no comando greenhouse:check e na documentação de evidências, separada das fixtures.
