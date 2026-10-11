# Fontes verificadas do seed

O seed da S0-05 cadastra configurações de empresas/fontes, sem importar vagas nem implementar conectores. As chamadas abaixo foram verificações pontuais dos identificadores públicos; o seed é local, determinístico e não depende de rede.

| Empresa                                       | Plataforma / board / região   | Verificação em 11/10/2026 UTC                                |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| [Figma](https://www.figma.com/careers/)       | GREENHOUSE / `figma` / GLOBAL | GET público retornou 200 e array com 150 itens às 06:19:41   |
| [Spotify](https://www.lifeatspotify.com/jobs) | LEVER / `spotify` / GLOBAL    | GET público com `limit=1` retornou 200 e um item às 06:20:29 |

Endpoints consultados:

- [Greenhouse: figma](https://boards-api.greenhouse.io/v1/boards/figma/jobs), SHA-256 da resposta `b4e8973a7fc264fa58ac87cef929b0b0305a22bebc0e2ae5b9536777411e85f3`.
- [Lever: spotify](https://api.lever.co/v0/postings/spotify?mode=json&limit=1), SHA-256 da resposta `c8296c2ac70d688cccd160f5715b49ba5acb6c287b8f783bb403a575a7cd0323`.

As contagens descrevem somente a resposta observada, não oportunidades de estágio nem disponibilidade futura. Nenhuma vaga dessa resposta foi persistida. As fontes não foram selecionadas como garantia de vagas no Brasil; filtros geográficos e conectores pertencem às próximas sprints.

Ashby: os endpoints públicos de `notion` e `ashby` retornaram HTTP 403 neste ambiente. Não foram usadas credenciais, contornadas restrições ou fabricada uma resposta. Nenhum board Ashby foi incluído como validado. **S0-05-P01:** verificar pelo menos um board Ashby antes da homologação do conector correspondente/S2-01. Wealthsimple retornou array vazio no Lever; Spotify foi escolhido por fornecer um anúncio verificável.

## Idempotência

`seed-data.ts` contém UUIDs internos estáveis das empresas. `seed-core.ts` executa uma transação e busca fontes pela identidade global `(platform, boardKey, region)`. Se a fonte já existir, usa sua empresa atual e não a reassocia; `update: {}` preserva `enabled`, inclusive `false`. Os nomes/URLs das empresas do seed são atualizados para os valores declarados, sem criar novas linhas a cada execução.

Testes reais confirmam quantidade de empresas/fontes, estabilidade dos IDs e preservação da fonte desativada. Fixtures de vagas/empresas usadas para testar constraints ficam somente no schema isolado de testes e não pertencem ao seed de desenvolvimento.

## S2-01 — Ashby verificado

Em 11/10/2026 às 08:23:48 UTC, o board `Ashby` indicado na [documentação oficial](https://developers.ashbyhq.com/docs/public-job-posting-api) respondeu HTTP 200 em `https://api.ashbyhq.com/posting-api/job-board/Ashby`, com 68 anúncios e isListed=true nessa amostra. Empresa Ashby, website https://www.ashbyhq.com, plataforma ASHBY, região GLOBAL. O seed agora inclui essa terceira fonte, preservando as fontes existentes e enabled=false. UUID interno estável da empresa não representa ID da plataforma.

A pendência S0-05-P01 está resolvida para esse board. Notion e o identificador anterior em minúsculas não foram homologados nem adicionados ao seed. A causa histórica dos 403 não foi comprovada; nenhuma restrição foi contornada. Resultados de persistência constam em [sprint-2.md](sprint-2.md).
