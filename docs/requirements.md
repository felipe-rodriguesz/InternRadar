---
title: "InternRadar — Especificação de Requisitos e MVP"
subtitle: "Documento de referência para desenvolvimento e agentes de código"
author: "Projeto pessoal | Engenharia de Software / Full Stack"
date: "10 de outubro de 2026"
lang: pt-BR
version: "1.0"
toc: true
toc-depth: 2
numbersections: false
fontsize: 10pt
mainfont: "DejaVu Sans"
monofont: "DejaVu Sans Mono"
colorlinks: true
geometry:
  - margin=2cm
  - headheight=14pt
---

> **Status:** proposta inicial de **base de planejamento**, sujeita à revisão e aprovação durante a Sprint 0.  
> **Público:** desenvolvedor responsável e agente de programação Codex.  
> **Regra de trabalho:** implementar somente o escopo da etapa atribuída, sem antecipar funcionalidades futuras.

# Resumo executivo

O **InternRadar** é uma plataforma web pessoal para **centralizar oportunidades de estágio em Engenharia de Software, Desenvolvimento Full Stack, Backend e Frontend**, obtidas de fontes de carreiras que disponibilizem consulta pública autorizada. A aplicação reduzirá o tempo de busca manual, identificará anúncios novos, permitirá filtros por preferências e abrirá o anúncio original para candidatura.

O desenvolvimento será **incremental**. O **MVP (Etapa 1)** terá coleta **manual** por APIs públicas de Greenhouse, Ashby e Lever, persistência em PostgreSQL e uma interface básica de consulta. **Automação recorrente, notificações, gestão de candidaturas, integração de e-mails e IA não pertencem ao MVP**; estão especificadas como fases posteriores para evitar crescimento descontrolado de escopo.

**Resultado esperado do MVP:** iniciar o projeto localmente, executar uma sincronização, consultar vagas reais com filtros e acessar as páginas originais, sem duplicar resultados em sincronizações repetidas.

## Quadro de decisões

| Item | Decisão |
|---|---|
| Nome | InternRadar (provisório) |
| Finalidade | Uso próprio e projeto demonstrável em portfólio |
| Usuário inicial | Uma pessoa, sem contas multiusuário no MVP |
| Tipo | Aplicação web, frontend e API separados em monorepo |
| Frontend | Next.js + React + TypeScript + Tailwind CSS |
| Backend | Node.js + NestJS + TypeScript |
| Persistência | PostgreSQL + Prisma |
| Ambiente local | Docker Compose para PostgreSQL; aplicativos Node no host |
| Coleta inicial | Conectores oficiais/públicos Greenhouse, Ashby e Lever |
| Método de busca do MVP | Consulta das empresas configuradas; não um índice global de todas as vagas |
| Método de candidatura | Redirecionamento para anúncio original |
| Autenticação | Dispensada **somente em ambiente local**, sem exposição pública |
| Critério de evolução | Cada fase deve estar funcional, testada e documentada antes da próxima |

# 1. Visão, contexto e objetivos

## 1.1 Problema

A procura de estágios em tecnologia exige consultar plataformas distintas, repetir filtros, verificar diversas páginas corporativas, reconhecer publicações repetidas e acompanhar manualmente oportunidades de interesse. Isso consome tempo que poderia ser dedicado a estudos, projetos e preparação para processos seletivos.

## 1.2 Proposta de valor

- **Encontrar:** agregar vagas das empresas e fontes cadastradas.
- **Organizar:** manter registros únicos, atualizáveis e rastreáveis por origem.
- **Filtrar:** localizar rapidamente oportunidades compatíveis com interesses básicos.
- **Agir:** abrir a página original para confirmar informações e candidatar-se.
- **Evoluir:** adicionar automação, alertas, gestão de candidaturas e IA em etapas separadas.

## 1.3 Objetivos verificáveis

| ID | Objetivo | Medida / comprovação |
|---|---|---|
| OBJ-01 | Reduzir esforço manual de busca | Consulta centralizada de ao menos três tipos de fonte configurados |
| OBJ-02 | Evitar retrabalho | Uma mesma vaga da mesma fonte não gera registros duplicados |
| OBJ-03 | Facilitar triagem | Pesquisa textual e filtros por fonte, localização e modalidade |
| OBJ-04 | Manter rastreabilidade | Toda vaga mostra origem, link, primeira e última identificação |
| OBJ-05 | Produzir portfólio técnico | Projeto executável, documentado, testado e versionado no GitHub |
| OBJ-06 | Preparar expansão | Interface de conector e módulos sem acoplamento direto ao frontend |

## 1.4 Personas e atores

- **Candidato administrador (ator principal):** desenvolvedor e usuário do sistema; consulta, filtra e abre vagas; escolhe empresas a acompanhar.
- **Fonte externa (ator de integração):** API pública de um portal de carreiras, com disponibilidade e estrutura próprias.
- **Operador de desenvolvimento (papel técnico):** inicia serviços, aplica migrações, carrega empresas e executa sincronizações.
- **Codex (assistente de desenvolvimento):** implementa tarefas delimitadas, respeitando especificação, testes e etapas; não é ator de negócio da aplicação.

## 1.5 Premissas

1. A aplicação começa local, acessível apenas pelo desenvolvedor.
2. O foco geográfico é o **Brasil**, com preferência inicial configurável por oportunidades remotas e Paraná, sem excluir outras localizações de modo irreversível.
3. As buscas incluem títulos em português e inglês: estágio, estagiário(a), intern, internship, software engineering, full stack, backend, frontend e termos equivalentes.
4. As fontes não garantem todos os campos de uma vaga; valores não fornecidos devem ser representados como **desconhecidos**.
5. O horário da fonte pode vir em UTC ou ISO 8601; a aplicação armazenará datas em UTC e exibirá datas em horário local do navegador.
6. O período de graduação, informações de currículo e critérios eliminatórios pessoais serão cadastrados apenas nas etapas adequadas.
7. Nenhuma vaga, empresa, requisito, prazo ou modalidade deve ser fabricado para suprir ausência de dados.

## 1.6 Restrições

- Não coletar páginas protegidas por login, contornar CAPTCHA, usar credenciais de terceiros ou ignorar termos de uso.
- Não automatizar candidaturas no MVP.
- Não prometer cobertura universal do mercado de vagas.
- Não tratar desaparecimento de um anúncio em uma única consulta como confirmação de encerramento.
- Não armazenar chaves privadas ou tokens no repositório.
- Não publicar a versão inicial sem autenticação na internet.

# 2. Escopo, entregas e fronteiras

## 2.1 Fases do produto

| Fase | Entrega central | Faz parte do MVP? |
|---|---|---|
| **1 — MVP** | Coleta manual, normalização, banco, pesquisa e listagem simples | **Sim** |
| 2 — Automação | Agendamento periódico, classificação por regras, alertas Telegram | Não |
| 3 — Plataforma completa | Dashboard avançado, favoritos, preferências e controle de candidaturas | Não |
| 4 — Expansão | Novas fontes autorizadas, alertas de e-mail, importação manual, prazos | Não |
| 5 — IA | Extração de requisitos, análise de currículo, comparação semântica e explicações | Não |
| Futuro opcional | Agente assistivo para candidaturas, com aprovação humana | Não |

## 2.2 Escopo incluído no MVP (obrigatório)

**MVP-IN-01.** Monorepo executável localmente, com frontend, backend e PostgreSQL.  
**MVP-IN-02.** Migrações de banco e carga inicial reprodutível de empresas/fontes.  
**MVP-IN-03.** Cadastro técnico de empresas e fontes via *seed* e/ou rotas administrativas locais documentadas.  
**MVP-IN-04.** Conectores Greenhouse, Ashby e Lever, com contrato padronizado.  
**MVP-IN-05.** Sincronização **sob demanda**, por comando CLI ou endpoint local controlado.  
**MVP-IN-06.** Normalização e validação de vagas retornadas.  
**MVP-IN-07.** Persistência idempotente e prevenção de duplicações na mesma fonte.  
**MVP-IN-08.** API de consulta paginada com pesquisa textual e filtros.  
**MVP-IN-09.** Página inicial de listagem, estados de carregamento, vazio e erro.  
**MVP-IN-10.** Página ou painel de detalhe com link externo para anúncio original.  
**MVP-IN-11.** Indicadores simples da última sincronização por fonte.  
**MVP-IN-12.** Testes essenciais, documentação de execução e amostras de resposta usadas nos testes.

## 2.3 Fora do MVP (explicitamente proibido antecipar sem aprovação)

- Agendamento automático ou jobs em background recorrentes.
- Notificação por Telegram, e-mail, push ou WhatsApp.
- Login, cadastro de múltiplos usuários, permissões por organização.
- Upload e interpretação de currículo.
- Score de compatibilidade personalizado e embeddings.
- Uso de LLM, agentes, RAG, chat e preenchimento de candidatura.
- Kanban de candidaturas, favoritos e notas pessoais.
- Integração com Gmail, LinkedIn, Gupy ou scraping de sites.
- Gestão automática de prazos de inscrição.
- Deploy público, arquitetura de microsserviços, Redis, mensageria e Kubernetes.
- Coleta de vagas a partir de URLs arbitrárias fornecidas por usuários.

## 2.4 Condição geral de aceite do MVP

O MVP será aceito quando, em uma instalação limpa, for possível: **subir o banco e serviços**, aplicar migrações e *seed*, sincronizar ao menos uma fonte válida de cada **tipo de conector** (Greenhouse, Ashby e Lever), repetir a sincronização sem duplicar registros, consultar vagas por interface e API, filtrar resultados e abrir anúncios originais. Os testes automatizados devem passar e o README deve permitir reproduzir todo o processo.

> A disponibilidade de empresas reais não é controlada pelo projeto. Se uma fonte externa estiver indisponível, o conector correspondente deverá passar em testes com *fixtures* e o comportamento de erro deverá ser demonstrado; a equipe registrará essa exceção de aceite explicitamente, sem declarar falsamente coleta real bem-sucedida.

# 3. Vocabulário e estados

| Termo | Definição |
|---|---|
| **Fonte (`JobSource`)** | Configuração de uma empresa em uma plataforma (ex.: board Greenhouse de uma empresa) |
| **Conector** | Código que realiza a consulta a um tipo de plataforma e converte seu retorno |
| **Anúncio / vaga (`Job`)** | Publicação específica de oportunidade, distinguida de um cargo genérico |
| **Identificador externo** | ID da publicação retornado pela origem; não é o ID interno do banco |
| **Sincronização (`SyncRun`)** | Execução registrada de consulta e persistência para uma fonte |
| **`firstSeenAt`** | Data/hora em que InternRadar identificou a vaga pela primeira vez |
| **`lastSeenAt`** | Última consulta **bem-sucedida** na qual a vaga foi encontrada |
| **`publishedAt`** | Data informada pela fonte; pode ser ausente e **não é substituída por `firstSeenAt`** |
| **Modalidade** | `REMOTE`, `HYBRID`, `ONSITE` ou `UNKNOWN` |
| **Status de disponibilidade** | `ACTIVE`, `POSSIBLY_CLOSED` ou `CLOSED` |
| **MVP** | Menor versão utilizável definida na seção 2, não sinônimo de produto final |

## 3.1 Semântica dos estados

- **`ACTIVE`:** foi vista em uma sincronização bem-sucedida recente da fonte ou importada inicialmente; não representa confirmação independente de que aceita candidaturas neste instante.
- **`POSSIBLY_CLOSED`:** ficará disponível em fase posterior, após regra de ausências consecutivas; no MVP, a lógica não deve marcar como fechada automaticamente.
- **`CLOSED`:** apenas quando houver evidência confiável/documentada do encerramento ou confirmação manual, nas fases que suportarem isso.

**Decisão MVP:** persistir o enum de status com valor padrão `ACTIVE`, mas **não implementar transições por ausência**. Registrar o resultado da última sincronização para futura implementação.

# 4. Requisitos funcionais do MVP

**Prioridades:** `P0` = essencial para aceitação; `P1` = desejável, implementável depois de todos os P0; `P2` = backlog futuro.

| ID | Prior. | Requisito |
|---|---|---|
| RF-001 | P0 | Iniciar frontend, API e banco no ambiente local documentado |
| RF-002 | P0 | Persistir empresas e suas fontes configuradas por seed reproduzível |
| RF-003 | P0 | Permitir ativar/desativar fontes via configuração persistida |
| RF-004 | P0 | Consultar vagas públicas do Greenhouse |
| RF-005 | P0 | Consultar vagas públicas do Ashby |
| RF-006 | P0 | Consultar vagas públicas do Lever, com paginação quando necessária |
| RF-007 | P0 | Normalizar campos heterogêneos para contrato comum |
| RF-008 | P0 | Validar dados mínimos e rejeitar itens inválidos com motivo no log |
| RF-009 | P0 | Executar sincronização manual de uma ou todas as fontes ativas |
| RF-010 | P0 | Armazenar vagas com unicidade por origem + ID externo |
| RF-011 | P0 | Atualizar vaga existente sem trocar sua primeira data de identificação |
| RF-012 | P0 | Registrar início, término, status, totais e erros de cada execução |
| RF-013 | P0 | Listar vagas com paginação estável |
| RF-014 | P0 | Filtrar por texto, plataforma/fonte, modalidade e localização |
| RF-015 | P0 | Exibir dados mínimos e origem de cada vaga |
| RF-016 | P0 | Disponibilizar detalhe de vaga e link original de candidatura |
| RF-017 | P0 | Apresentar estados de carregamento, erro e nenhum resultado no frontend |
| RF-018 | P0 | Disponibilizar endpoint de saúde e documentação de API |
| RF-019 | P0 | Expor último resultado de sincronização por fonte |
| RF-020 | P1 | Ordenação alternativa por empresa/título além da mais recente identificação |
| RF-021 | P1 | Filtro por termos de estágio baseado em títulos e descrições |
| RF-022 | P1 | Reprocessar uma execução malsucedida manualmente |
| RF-023 | P1 | Mostrar resumo dos totais por origem no cabeçalho |

## 4.1 Requisitos de fases posteriores (reservados)

| ID | Fase | Requisito |
|---|---|---|
| EV-001 | 2 | Sincronização agendada, idempotente e tolerante a falhas |
| EV-002 | 2 | Score por regras e preferências pessoais |
| EV-003 | 2 | Notificação Telegram sem repetição indevida |
| EV-004 | 3 | Dashboard ampliado e detalhes enriquecidos |
| EV-005 | 3 | Favoritos, ocultação e histórico de candidatura |
| EV-006 | 3 | Preferências pessoais persistidas e edição pela interface |
| EV-007 | 4 | Integração consentida com alertas por e-mail |
| EV-008 | 4 | Importação manual de vagas por formulário |
| EV-009 | 4 | Cadastro de prazos e programas de estágio |
| EV-010 | 5 | Extrair requisitos das descrições usando IA |
| EV-011 | 5 | Analisar currículo com consentimento e controle de armazenamento |
| EV-012 | 5 | Ranqueamento explicável com tratamento de incerteza |
| EV-013 | futuro | Assistência a candidaturas, somente com revisão humana |

# 5. Histórias de usuário e critérios de aceitação

Cada história tem ID estável, prioridade, pré-condições, critérios mensuráveis e vínculo com os requisitos funcionais. As histórias do MVP são a fonte principal para derivar testes de aceitação.

## HU-01 — Preparar e executar localmente (P0)

**Como** desenvolvedor, **quero** preparar e iniciar o InternRadar por comandos documentados, **para** trabalhar de forma reprodutível no meu computador.

**Pré-condições:** Git, Node.js LTS e Docker disponíveis; arquivo `.env` baseado em `.env.example`.

**Aceite:**

- **Dado** um clone limpo e dependências instaladas, **quando** executar os comandos descritos no README, **então** o PostgreSQL, a API e o frontend iniciam sem intervenção manual fora dos passos documentados.
- **Dado** banco vazio, **quando** executar migração e seed, **então** as tabelas existem e as empresas/fontes de exemplo são criadas sem duplicação em reexecuções.
- **Dado** serviços ativos, **quando** acessar `GET /health`, **então** a API responde `200` e um JSON de status sem expor segredos.

**Relacionados:** RF-001, RF-002, RF-018. **Testes:** TA-01.

## HU-02 — Configurar fontes monitoradas (P0)

**Como** operador, **quero** cadastrar configurações válidas de fonte por empresa, **para** definir quais portais consultar.

**Aceite:**

- Cada fonte contém empresa, tipo (`GREENHOUSE`, `ASHBY` ou `LEVER`), identificador do board/site e flag `enabled`.
- A combinação de `platform`, `boardKey` e região/host aplicável não produz fontes duplicadas na mesma empresa; duplicações são rejeitadas ou resolvidas por *upsert* documentado.
- Desabilitar uma fonte impede sua inclusão em uma sincronização global posterior, sem apagar vagas anteriores.
- O sistema não aceita URLs livres como configuração de endpoint; os domínios das três plataformas são fixos no conector.

**Relacionados:** RF-002, RF-003. **Testes:** TA-02.

## HU-03 — Sincronizar Greenhouse (P0)

**Como** candidato, **quero** carregar anúncios públicos do board Greenhouse de uma empresa configurada, **para** enxergar as vagas sem visitar seu portal manualmente.

**Aceite:**

- **Dada** uma fonte Greenhouse habilitada e válida, **quando** a sincronização manual ocorrer, **então** o conector solicita o endpoint público de listagem com `content=true`, processa os itens válidos e informa o total recebido.
- Um item com ID e título válidos, URL original válida e demais dados opcionais ausentes é persistido com valores `null`/`UNKNOWN` apropriados.
- HTTP 429, 5xx, timeout ou JSON inválido tornam a sincronização malsucedida, com erro classificado e sem apagar registros existentes.

**Relacionados:** RF-004, RF-007 a RF-012. **Testes:** TA-03.

## HU-04 — Sincronizar Ashby (P0)

**Como** candidato, **quero** carregar anúncios públicos de boards Ashby, **para** ampliar as empresas monitoradas.

**Aceite:**

- O conector usa o board configurado e mapeia título, descrição, modalidade, datas e URL conforme campos presentes na resposta. Como a API pública documentada não especifica um campo de ID de publicação, o sistema usa um identificador derivado de **URL canônica de vaga** (hash estável) quando não houver ID explícito confiável.
- Quando houver `employmentType`, ele é preservado; `Intern` pode ser identificado como estágio sem generalizar os demais tipos.
- Se `isListed=false`, o comportamento de inclusão/exclusão deve ser documentado e testado; **decisão MVP: não exibir vagas não listadas na busca padrão**.
- Campos opcionais ausentes não geram data, modalidade ou remuneração fictícia.

**Relacionados:** RF-005, RF-007 a RF-012. **Testes:** TA-04.

## HU-05 — Sincronizar Lever (P0)

**Como** candidato, **quero** carregar anúncios públicos de sites Lever, **para** visualizar oportunidades de empresas que usam essa plataforma.

**Aceite:**

- O conector chama o endpoint JSON para o `site` configurado.
- Quando necessário, realiza paginação usando `skip` e `limit` até concluir a listagem, sem repetir itens.
- Identifica corretamente `id`, título (`text`), categorias de localização/compromisso e links originais quando retornados.
- Respostas vazias válidas representam zero vagas e não erro; falhas de transporte são registradas como erro.

**Relacionados:** RF-006 a RF-012. **Testes:** TA-05.

## HU-06 — Não duplicar vagas (P0)

**Como** candidato, **quero** que uma vaga encontrada repetidamente apareça apenas uma vez, **para** não perder tempo revisando registros repetidos.

**Aceite:**

- **Dada** uma vaga já salva, **quando** sincronizar novamente a mesma fonte com o mesmo identificador externo, **então** a quantidade de registros dessa vaga continua igual a um.
- O conteúdo modificável, `lastSeenAt` e `updatedAt` são atualizados; `firstSeenAt` permanece inalterado.
- Uma publicação com mesmo ID externo em **fonte diferente** não é mesclada automaticamente.
- Duas sincronizações concorrentes não criam registros repetidos: a unicidade é garantida também pelo banco.

**Relacionados:** RF-010, RF-011. **Testes:** TA-06.

## HU-07 — Consultar e filtrar vagas (P0)

**Como** candidato, **quero** consultar uma lista paginada com filtros, **para** encontrar vagas relevantes rapidamente.

**Aceite:**

- A listagem aceita `q`, `platform`, `sourceId`, `workplaceType`, `location`, `page` e `pageSize`.
- `q` busca em título e descrição normalizada (sem distinção de maiúsculas/minúsculas); resultados correspondem ao filtro solicitado.
- Os filtros são combinados por **AND**; sem filtros, aparecem todas as vagas incluídas no índice do MVP.
- A resposta informa `items`, `page`, `pageSize` e `total`; resultado vazio devolve `items: []`, não erro.
- A ordenação padrão é `firstSeenAt DESC, id DESC`, estável para paginação.

**Relacionados:** RF-013, RF-014. **Testes:** TA-07.

## HU-08 — Ler detalhes e abrir candidatura (P0)

**Como** candidato, **quero** conhecer os detalhes de uma vaga e abrir seu anúncio de origem, **para** confirmar requisitos e realizar a candidatura fora do InternRadar.

**Aceite:**

- A página mostra empresa, título, descrição em formato legível, localização, modalidade, fonte, datas disponíveis e link original.
- Dados ausentes aparecem como **“Não informado”**; `firstSeenAt` é rotulado “Identificada pelo InternRadar”, nunca “Publicada em”.
- O link abre somente URL `https://` ou `http://` validada; a interface sinaliza que a candidatura acontece fora do sistema.
- Uma vaga inexistente gera resposta `404` e tela apropriada.

**Relacionados:** RF-015, RF-016. **Testes:** TA-08.

## HU-09 — Entender os resultados de sincronização (P0)

**Como** operador, **quero** saber se uma fonte foi consultada com sucesso, **para** identificar resultados desatualizados ou falhas.

**Aceite:**

- Cada execução registra início, fim, fonte, status `RUNNING/SUCCESS/FAILED`, itens recebidos, criados, atualizados, ignorados e mensagem sanitizada de erro, quando houver.
- O frontend indica o último status e horário por fonte, sem reportar “atualizado agora” quando a consulta fracassou.
- A falha de uma fonte não apaga vagas nem torna falsamente bem-sucedidas as outras.

**Relacionados:** RF-009, RF-012, RF-019. **Testes:** TA-09.

## HU-10 — Navegar por uma interface utilizável (P0)

**Como** candidato, **quero** usar uma interface clara em desktop e celular, **para** pesquisar vagas sem depender de consultas SQL ou chamadas manuais de API.

**Aceite:**

- Interface responsiva, com formulário de busca, filtros acessíveis, cartões ou linhas de vaga e indicação da fonte.
- Estados `loading`, erro de API, sem vagas armazenadas e nenhum resultado para os filtros são distintos e acompanhados de mensagens úteis.
- A pesquisa pode ser iniciada pelo usuário sem recarregar a aplicação inteira.
- O frontend não chama APIs de vagas externas diretamente; consulta somente a API do InternRadar.

**Relacionados:** RF-013 a RF-017. **Testes:** TA-10.

## HU-11 — Confiar em informações ausentes (P0)

**Como** candidato, **quero** que campos desconhecidos sejam apresentados honestamente, **para** não tomar decisões com base em dados inventados.

**Aceite:**

- Um anúncio sem data de publicação mostra “Data de publicação não informada”.
- Sem informação inequívoca sobre modalidade, a modalidade é `UNKNOWN` e aparece como “Não informada”.
- Uma vaga em outra cidade não recebe `REMOTE` com base apenas no nome do time ou empresa.
- Uma publicação desaparecida de uma busca não é marcada `CLOSED` apenas por essa ausência no MVP.

**Relacionados:** RF-007, RF-015. **Testes:** TA-11.

## HU-12 — Compreender e reproduzir o projeto (P0)

**Como** recrutador ou colaborador técnico, **quero** acessar documentação e testes, **para** verificar como o projeto funciona e avaliar sua qualidade.

**Aceite:**

- README contém propósito, stack, arquitetura resumida, pré-requisitos, comandos, variáveis e limitações.
- `.env.example` não contém senhas reais, tokens nem dados pessoais.
- Testes unitários cobrem normalização, filtros e idempotência; testes de integração cobrem banco e rotas principais; conectores externos são testados com *fixtures*.
- `lint`, checagem de tipos, build e testes passam nos comandos documentados.

**Relacionados:** RF-001, RF-018. **Testes:** TA-12.

# 6. Regras de negócio

| ID | Regra | Fase |
|---|---|---|
| RN-001 | Uma fonte pertence a uma empresa e a uma plataforma configurada | MVP |
| RN-002 | Só fontes `enabled=true` participam de sincronizações globais | MVP |
| RN-003 | Identidade primária de vaga: (`jobSourceId`, `externalId`) | MVP |
| RN-004 | `firstSeenAt` é imutável após inserção | MVP |
| RN-005 | `lastSeenAt` só avança se a vaga for vista em resposta válida da fonte | MVP |
| RN-006 | `publishedAt` nunca é inferido da hora de coleta | MVP |
| RN-007 | Valores ausentes são `null` ou `UNKNOWN`, não suposições | MVP |
| RN-008 | Ações de candidatura sempre ocorrem no site original | MVP |
| RN-009 | Erros de uma fonte não excluem vagas existentes | MVP |
| RN-010 | Cada sincronização produz registro auditável com status final | MVP |
| RN-011 | HTTP 429 deve respeitar `Retry-After` quando presente, com limite de tentativas | MVP |
| RN-012 | Endpoints de origem são fixados no código e não recebem host arbitrário do usuário | MVP |
| RN-013 | Falha parcial na normalização descarta apenas itens inválidos e os contabiliza; falha da consulta integral reprova a execução | MVP |
| RN-014 | Resultados de busca usam paginação limitada e ordem determinística | MVP |
| RN-015 | Títulos e descrições externas são dados não confiáveis e não podem executar HTML/script | MVP |
| RN-016 | `UNKNOWN` não equivale a `REMOTE`, `HYBRID` nem `ONSITE` | MVP |
| RN-017 | `ACTIVE` significa identificado como listado, não garantia de inscrição aberta neste momento | MVP |
| RN-018 | A ausência de vagas após uma consulta não prova encerramento definitivo | MVP |
| RN-019 | Score de compatibilidade **não** é probabilidade de contratação | Etapa 2+ |
| RN-020 | Critérios eliminatórios devem ser independentes do score | Etapa 2+ |
| RN-021 | Uma vaga não gera alertas repetidos ao mesmo usuário sem evento relevante definido | Etapa 2+ |
| RN-022 | Dados de currículo requerem finalidade explícita e proteção adequada | Etapa 5 |
| RN-023 | IA deve citar trechos/fatos da vaga que fundamentam seu parecer | Etapa 5 |
| RN-024 | Nenhuma candidatura pode ser enviada por um agente sem ação humana final e expressa | Futuro |

## 6.1 Política de dados inconsistentes

- **ID ausente/inválido:** nas fontes que documentam um identificador externo (Greenhouse/Lever), descartar o item e registrar motivo. **Exceção planejada para Ashby:** gerar `externalId` determinístico a partir de uma URL de vaga canônica válida quando a API pública não fornecer ID; se não houver URL válida, descartar. Não utilizar número aleatório nem ID dependente da ordem retornada.
- **Título ausente/vazio:** descartar o item.
- **Link de anúncio inválido/inexistente:** descartar o item da listagem do MVP, por impossibilitar a finalidade principal de candidatura.
- **Descrição vazia:** aceitar, mostrando ausência de conteúdo.
- **Localidade ausente:** aceitar com `null`.
- **Modalidade incerta:** `UNKNOWN`.
- **Data inválida:** `null` e aviso não fatal no log estruturado.
- **Regiões múltiplas:** preservar texto completo de localização e guardar informações estruturadas somente se inequívocas.
- **Vaga repetida entre plataformas:** não fundir automaticamente no MVP; deduplicação entre fontes é decisão posterior.

## 6.2 Política de atualização

Em nova sincronização bem-sucedida, atualizar campos originados da fonte (`title`, `description`, `location`, `workplaceType`, `employmentType`, `jobUrl`, `publishedAt`) e `lastSeenAt`, preservando a identidade e `firstSeenAt`. **Um campo ausente no payload atual não deve ser substituído por invenção**; a política de limpar ou preservar valores opcionais deve ser consistente, preferencialmente refletindo o estado atual da fonte após validação completa.

A sincronização de cada fonte deve ser transacional no que for necessário para preservar integridade; evitar uma transação de banco longa envolvendo toda a chamada HTTP externa.

# 7. Especificação técnica da coleta

## 7.1 Contrato dos conectores

Implementar uma interface conceitual equivalente a:

```typescript
export type SourcePlatform = 'GREENHOUSE' | 'ASHBY' | 'LEVER';

export interface NormalizedJob {
  externalId: string;
  title: string;
  description: string | null;
  location: string | null;
  workplaceType: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';
  employmentType: string | null;
  jobUrl: string;
  publishedAt: Date | null;
}

export interface JobSourceConfig {
  id: string;
  platform: SourcePlatform;
  boardKey: string;
  region?: 'GLOBAL' | 'EU';
}

export interface JobConnector {
  fetchJobs(source: JobSourceConfig): Promise<NormalizedJob[]>;
}
```

O contrato final pode incluir contadores ou um resultado detalhado, mas deve manter **separação entre consulta, validação, normalização e persistência**. A função de identificação da Ashby deve ser testada com URLs iguais, com parâmetros de rastreamento, fragmentos e barra final, para que produzam o mesmo `externalId` quando apontarem ao mesmo anúncio. Cada conector será isoladamente testável.

## 7.2 Endpoints oficiais de referência

- **Greenhouse:** `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` com query `content=true`; GET público, com `id` da publicação.
- **Ashby:** `GET https://api.ashbyhq.com/posting-api/job-board/{job_board_name}`; resposta com array `jobs` e campos opcionais.
- **Lever:** `GET https://api.lever.co/v0/postings/{site}` com query `mode=json`, `skip=0`, `limit=100`; paginar até completar. Confirmar host regional EU quando aplicável.

**Não usar APIs privadas de gestão ou de submissão de candidatura.** Confirmar detalhes de resposta com a documentação atual no momento da implementação (fontes no apêndice).

## 7.3 Mapeamento inicial por fonte

| Campo normalizado | Greenhouse | Ashby | Lever |
|---|---|---|---|
| `externalId` | `id` convertido para string | Identificador estável por URL canônica (`urlsha256:<hash>`), salvo se a API passar a documentar um ID confiável | `id` |
| `title` | `title` | `title` | `text` |
| `description` | `content` sanitizado | `descriptionPlain` (preferível) ou HTML sanitizado | Descrição textual/HTML retornada, sanitizada |
| `location` | `location.name`, quando presente | `location`, quando presente | `categories.location` ou localizações |
| `workplaceType` | `UNKNOWN` salvo sinal confiável | `workplaceType` / `isRemote` | `UNKNOWN` salvo sinal inequívoco |
| `employmentType` | Metadados apenas se divulgados | `employmentType` | `categories.commitment` |
| `jobUrl` | `absolute_url` | `jobUrl` ou `applyUrl` | `hostedUrl` ou `applyUrl` |
| `publishedAt` | Somente campo comprovadamente equivalente à publicação | `publishedAt` | Apenas se a fonte expuser data de publicação inequívoca |

**Nota de mapeamento:** a estrutura exata das respostas pode variar entre versões e instâncias. A confirmação deve ocorrer com amostras reais + fixtures antes de finalizar cada adaptador. Em particular, **não confundir `updated_at` de um anúncio com sua data de publicação**. A documentação pública consultada da Ashby não descreve um campo `jobs[].id`; a identificação por URL canônica é, portanto, uma **decisão de projeto**. Canonicalizar removendo query string/fragmento e normalizando host, path e barra final antes de obter um hash SHA-256; evitar transformações que possam mesclar publicações diferentes. Caso a URL permanente da vaga mude, uma duplicidade poderá ocorrer e será tratada como limitação conhecida, não como coincidência garantida.

## 7.4 Resiliência e limites

- Timeout HTTP inicial de **10 s por tentativa**.
- Máximo inicial de **3 tentativas totais** para falhas transitórias (timeout, 429 ou 5xx), com *backoff* exponencial e *jitter*.
- Não repetir automaticamente 4xx definitivos (exceto 429).
- Respeitar `Retry-After` dentro de um limite razoável e registrar quando exceder a janela configurada.
- Concorrência inicial de **2 fontes em paralelo no máximo**; configurável para reduzir carga.
- Limite de **100 páginas por fonte** por sincronização para evitar loops; ajustar conforme necessidade com justificativa.
- Definir User-Agent identificando a aplicação quando apropriado; obedecer restrições relevantes do provedor.
- Não buscar URL arbitrária originada do anúncio; o `jobUrl` é exibido, não acessado pelo servidor.
- Nunca usar `eval`, executar scripts extraídos de anúncios nem renderizar HTML bruto sem sanitização.

# 8. Modelo de dados do MVP

## 8.1 Entidades obrigatórias

### `Company`

| Campo | Tipo lógico | Restrições |
|---|---|---|
| `id` | UUID | PK |
| `name` | string | obrigatório |
| `websiteUrl` | string? | opcional; URL válida |
| `createdAt` / `updatedAt` | datetime UTC | obrigatórios |

### `JobSource`

| Campo | Tipo lógico | Restrições |
|---|---|---|
| `id` | UUID | PK |
| `companyId` | UUID | FK -> Company |
| `platform` | enum | GREENHOUSE, ASHBY, LEVER |
| `boardKey` | string | obrigatório; identificador do portal |
| `region` | enum? | GLOBAL/EU, onde aplicável |
| `enabled` | boolean | padrão `true` |
| `createdAt` / `updatedAt` | datetime UTC | obrigatórios |

Índice de unicidade recomendado: `(platform, boardKey, region)` **quando a região não for nula**; padronizar região com valor padrão `GLOBAL` para permitir restrição simples. Uma única configuração de board pode pertencer a uma empresa cadastrada; evitar fontes idênticas em empresas duplicadas.

### `Job`

| Campo | Tipo lógico | Restrições |
|---|---|---|
| `id` | UUID | PK |
| `jobSourceId` | UUID | FK -> JobSource |
| `externalId` | string | obrigatório |
| `title` | string | obrigatório |
| `description` | text? | HTML convertido em texto seguro |
| `location` | string? | opcional |
| `workplaceType` | enum | REMOTE, HYBRID, ONSITE, UNKNOWN |
| `employmentType` | string? | opcional |
| `jobUrl` | URL | obrigatório, http(s) |
| `publishedAt` | datetime? | UTC, opcional |
| `firstSeenAt` | datetime | obrigatório, imutável |
| `lastSeenAt` | datetime | obrigatório |
| `status` | enum | padrão ACTIVE |
| `createdAt` / `updatedAt` | datetime UTC | obrigatórios |

**Constraint obrigatória:** `UNIQUE(jobSourceId, externalId)`. Índices recomendados em `firstSeenAt`, `workplaceType`, `jobSourceId`, e pesquisa textual onde houver ganho real.

### `SyncRun`

| Campo | Tipo lógico | Restrições |
|---|---|---|
| `id` | UUID | PK |
| `jobSourceId` | UUID | FK -> JobSource |
| `status` | enum | RUNNING, SUCCESS, FAILED |
| `startedAt` | datetime | obrigatório |
| `finishedAt` | datetime? | preenchido ao concluir |
| `fetchedCount` | inteiro | >= 0 |
| `createdCount` | inteiro | >= 0 |
| `updatedCount` | inteiro | >= 0 |
| `skippedCount` | inteiro | >= 0 |
| `errorCode` | string? | código técnico padronizado |
| `errorMessage` | string? | mensagem curta sem segredo |

O tipo de status e a transição do `SyncRun` devem ser consistentes: `RUNNING -> SUCCESS` ou `RUNNING -> FAILED`; execuções interrompidas abruptamente precisam ser identificáveis como incompletas ao reiniciar, sem gerar falsa confirmação de sucesso.

## 8.2 Diagrama lógico simplificado

```text
Company (1) ──< (N) JobSource
                       │
                       ├──< (N) Job
                       └──< (N) SyncRun
```

## 8.3 Evolução prevista, mas não criada antecipadamente

Na Etapa 2: `UserPreferences`, `JobMatch`, `Notification`; na Etapa 3: `Application`, `SavedJob`; na Etapa 5: `ResumeProfile`, `Skill`, `MatchEvidence`. O esquema do MVP **não deve criar essas entidades por antecipação**, salvo decisão arquitetural escrita e justificada.

# 9. Contrato REST do MVP

Prefixo sugerido: `/api/v1`. JSON como formato principal. Os exemplos abaixo são contratos desejados; mudanças exigem atualização deste documento e dos testes.

| Método | Rota | Função | Status esperados |
|---|---|---|---|
| GET | `/api/v1/health` | Saúde da API | 200 |
| GET | `/api/v1/companies` | Empresas com fontes | 200 |
| GET | `/api/v1/sources` | Fontes cadastradas e status | 200 |
| GET | `/api/v1/jobs` | Lista filtrada e paginada | 200, 400 |
| GET | `/api/v1/jobs/:id` | Detalhe da vaga | 200, 404 |
| GET | `/api/v1/sync-runs` | Histórico paginado de sincronizações | 200, 400 |
| POST | `/api/v1/sync-runs` | Iniciar sincronização manual local | 202 ou 200, 400, 409 |

**Decisão do MVP:** `POST /sync-runs` só estará disponível em ambiente de desenvolvimento local, com origem/host restritos; não publicar sem autenticação. Alternativamente, o CLI `pnpm sync:jobs` pode ser a única via de acionamento do processo; nesse caso, documentar a decisão e adaptar o critério de aceite de UI. A listagem e leitura continuam acessíveis via API local.

## 9.1 Exemplo: consulta

```http
GET /api/v1/jobs?q=software&workplaceType=REMOTE&page=1&pageSize=20
```

```json
{
  "items": [
    {
      "id": "uuid-exemplo",
      "title": "Software Engineering Intern",
      "company": { "id": "uuid-empresa", "name": "Empresa Exemplo" },
      "source": { "platform": "ASHBY", "id": "uuid-fonte" },
      "location": "Brasil",
      "workplaceType": "REMOTE",
      "employmentType": "Intern",
      "jobUrl": "https://jobs.ashbyhq.com/exemplo/id-exemplo",
      "publishedAt": null,
      "firstSeenAt": "2026-10-10T12:00:00.000Z",
      "lastSeenAt": "2026-10-10T12:00:00.000Z",
      "status": "ACTIVE"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

> **Atenção:** este JSON é **fictício para contrato e teste**, não uma vaga real. Dados reais só poderão vir da fonte configurada.

## 9.2 Parâmetros e validações

| Parâmetro | Regra |
|---|---|
| `page` | Inteiro >= 1; padrão 1 |
| `pageSize` | Inteiro 1..100; padrão 20 |
| `q` | Texto até 200 caracteres; busca case-insensitive em título/descrição |
| `platform` | GREENHOUSE / ASHBY / LEVER |
| `sourceId` | UUID válido |
| `workplaceType` | REMOTE / HYBRID / ONSITE / UNKNOWN |
| `location` | Texto até 100 caracteres; busca textual, não geocodificada |

Filtro vazio deve ser ignorado; enum inválido e paginação fora dos limites devem devolver `400` com mensagem útil e formato de erro padronizado. Usar uma única política de tratamento de espaços e normalização Unicode para entradas de busca.

## 9.3 Acionamento manual

Corpo sugerido para `POST /api/v1/sync-runs`:

```json
{ "sourceId": "uuid-da-fonte" }
```

O envio sem `sourceId` executa todas as fontes habilitadas. A API deve documentar se responde **200 com resultado concluído** ou **202 com identificador de execução**; **MVP preferencial: 200 síncrono apenas para pequenos lotes, mas CLI é preferível quando a duração ultrapassar o timeout da requisição**. Não iniciar trabalhos invisíveis não persistidos nem prometer conclusão se apenas foram iniciados.

## 9.4 Formato de erro

```json
{
  "statusCode": 400,
  "code": "INVALID_QUERY",
  "message": "O parâmetro page deve ser maior ou igual a 1."
}
```

Erros internos nunca devem expor stack traces, tokens, SQL ou payloads completos de terceiros ao frontend.

# 10. Interface do MVP

## 10.1 Telas

**Tela A — Vagas (`/jobs`, ou `/` redirecionando para `/jobs`):** título e resumo, campo de busca, filtros (plataforma, modalidade, localização), total de resultados, cartões/lista e paginação. Cada registro mostra empresa, título, modalidade quando conhecida, localização quando fornecida, origem e data de identificação.

**Tela B — Detalhe (`/jobs/[id]`):** dados normalizados, descrição legível, avisos para campos ausentes e botão/link “Ver vaga original”. O destino é o endereço validado da fonte externa.

**Tela C — Fontes (`/sources`, leitura simples):** empresa, plataforma, status habilitado, última sincronização e resultado. No MVP, o cadastro pode ser feito via seed/CLI, não exige CRUD completo na interface.

## 10.2 Estados da interface

| Estado | Comportamento obrigatório |
|---|---|
| Aguardando API | Skeleton ou indicador de carregamento, sem tela em branco |
| Nenhuma vaga armazenada | Explicar como executar sincronização local |
| Nenhum resultado do filtro | Mensagem e opção de limpar filtros |
| Erro de rede/API | Mensagem legível e ação de tentar novamente |
| Dados opcionais ausentes | “Não informado”, sem inferir informação |
| Link inválido (dado legado) | Não renderizar link acionável; mostrar erro do dado |

## 10.3 Acessibilidade básica

- Usar HTML semântico, `<label>` associado aos filtros e navegação por teclado.
- Foco visível, contraste adequado e mensagens que não dependam exclusivamente de cores.
- Links externos com texto descritivo; atributos seguros quando abertos em nova aba.
- Layout responsivo em larguras típicas de celular e desktop.

# 11. Requisitos não funcionais

Os limites abaixo são **metas iniciais de projeto**, não garantias de terceiros. Devem ser medidos em máquina de desenvolvimento com base de teste documentada.

| ID | Categoria | Critério verificável |
|---|---|---|
| RNF-001 | Portabilidade | Ambiente reproduzível em Windows com Docker Desktop e Node.js LTS; comandos compatíveis com PowerShell ou documentados separadamente |
| RNF-002 | Manutenibilidade | Frontend não contém lógica de consulta às APIs externas; cada fonte usa adapter isolado |
| RNF-003 | Tipagem | TypeScript em modo estrito; sem `any` arbitrário nos contratos principais |
| RNF-004 | Integridade | Constraint única no banco para `(jobSourceId, externalId)` |
| RNF-005 | Segurança | Endpoints de execução administrativa indisponíveis para acesso remoto não autenticado |
| RNF-006 | Segredos | Credenciais em variáveis de ambiente, ignoradas pelo Git; `.env.example` com placeholders |
| RNF-007 | Dados externos | Descrição sanitizada; sem execução de HTML, scripts ou URLs arbitrárias no backend |
| RNF-008 | Resiliência | Timeout e retries limitados; falhas de consulta preservam vagas já gravadas |
| RNF-009 | Desempenho da API | `GET /jobs` p95 <= 500 ms com 10 mil registros em ambiente local de teste, excluindo tempo de inicialização |
| RNF-010 | Paginação | Limite máximo de 100 itens por página; ordenação estável |
| RNF-011 | Usabilidade | Fluxo “listar -> filtrar -> abrir anúncio” realizável pela interface sem terminal |
| RNF-012 | Responsividade | Sem rolagem horizontal não intencional em viewport de 375 px |
| RNF-013 | Observabilidade | Log estruturado por execução com `sourceId`, duração, totais e categoria de erro |
| RNF-014 | Testabilidade | Conectores testáveis sem chamadas de rede reais em CI |
| RNF-015 | CI | `lint`, `typecheck`, build e testes executáveis por scripts consistentes; CI ao menos nos PRs |
| RNF-016 | Documentação | README de instalação, comandos, arquitetura, fontes e limitações atualizado |
| RNF-017 | Privacidade | Nenhuma informação pessoal de candidato necessária no MVP |
| RNF-018 | Compatibilidade | Frontend funcional nas versões recentes de Chrome e Firefox; conferir manualmente |
| RNF-019 | Evolução | Adicionar quarto conector não exige alterações na lógica de listagem, filtros nem contrato público de `Job` |
| RNF-020 | Custo | Execução local sem serviços pagos obrigatórios; serviços externos pagos só com aprovação explícita |

**Medição RNF-009:** criar seed de carga controlada com 10.000 vagas sintéticas, realizar 100 consultas após aquecimento, medir latência p95 no mesmo ambiente e registrar CPU/RAM/índices. Não bloquear o MVP por não atender a meta antes de investigar plano de consulta e índices; registrar o desvio e a decisão.

# 12. Cenários de testes de aceitação

| ID | Cenário | Resultado esperado |
|---|---|---|
| TA-01 | Clone limpo -> instalação -> migração -> seed -> `GET /health` | Aplicação operacional |
| TA-02 | Executar seed duas vezes e desativar fonte | Sem fontes duplicadas; fonte inativa não sincronizada |
| TA-03 | Greenhouse fixture completa e fixture inválida | Campos corretos; inválidos contabilizados; falha total sem exclusões |
| TA-04 | Ashby com `isListed`, modalidade e campos ausentes | Política correta; `UNKNOWN` quando necessário |
| TA-05 | Lever com múltiplas páginas e última página vazia | Todas as vagas únicas coletadas; laço termina |
| TA-06 | Repetir importação da mesma vaga e fazer concorrência controlada | Uma linha; `firstSeenAt` preservado |
| TA-07 | Aplicar filtros isolados e combinados; página 2; busca vazia | Itens e total corretos; paginação determinística |
| TA-08 | Ver detalhe existente e inexistente; URL inválida | Exibe/oculta link conforme validação; 404 adequado |
| TA-09 | Timeout/429/500 em uma fonte e sucesso em outra | Erro e contadores registrados; dados anteriores preservados |
| TA-10 | Abrir UI em desktop/mobile; simular loading, erro e vazio | Estados legíveis, responsivos e navegáveis por teclado |
| TA-11 | Sem data, modalidade ou descrição; anúncio some de uma consulta | Sem informações inventadas e sem encerramento indevido |
| TA-12 | Executar lint, typecheck, testes e build em ambiente limpo | Todos os comandos passam e estão no README |

## 12.1 Pirâmide de testes mínima

- **Unitários:** normalização de cada conector; sanitização; validação; filtros; tratamento de campos nulos; política de URL.
- **Integração:** repositórios Prisma em PostgreSQL de teste; unicidade; upsert; endpoint GET paginado; registro de `SyncRun`.
- **E2E:** carregar `/jobs`, filtrar, abrir detalhe e link externo; testar estados principais com rede simulada.
- **Contratos externos:** fixtures JSON versionadas representando sucesso, vazio e retorno malformado; sem dependência da internet no CI.

**Meta de cobertura:** cobertura significativa de regras críticas; **não** usar “80% total” como substituto de testar idempotência, normalização e falhas. Se optar por meta numérica, considerar >= 80% de ramos nos serviços de domínio e coletores, registrada no CI.

# 13. Plano de execução e backlog

## 13.1 Sprint 0 — Fundação (estimativa 2–3 dias úteis)

| Ordem | Entrega | Condição de pronto |
|---|---|---|
| S0-01 | Repositório e ferramentas | Monorepo, lint/format/typecheck, `.gitignore`, `.env.example` |
| S0-02 | Documentos-base | Esta especificação em `/docs/requirements.md`, README e ADR inicial |
| S0-03 | Docker/PostgreSQL | Banco sobe com Compose e healthcheck |
| S0-04 | Apps web/api | Next.js e NestJS inicializam e se comunicam |
| S0-05 | Prisma | Schema inicial, migração e seed reproduzível |
| S0-06 | CI mínima | Pipeline de checagens em PR |

## 13.2 Sprint 1 — Primeiro conector vertical (estimativa 3–5 dias)

| Ordem | Entrega | Condição de pronto |
|---|---|---|
| S1-01 | Interface `JobConnector` e tipos | Testes unitários passam |
| S1-02 | Greenhouse | Consome um board real testado; fixtures e erros tratados |
| S1-03 | Serviço de sincronização | Cria `SyncRun`, valida, faz upsert, salva contadores |
| S1-04 | GET `/jobs` | Filtros, ordenação e paginação funcionando |
| S1-05 | Interface `/jobs` | Lista vagas reais da base |

## 13.3 Sprint 2 — Completar o MVP (estimativa 4–7 dias)

| Ordem | Entrega | Condição de pronto |
|---|---|---|
| S2-01 | Ashby e Lever | Fixtures, coleta, paginação Lever |
| S2-02 | Detalhe de vaga | Link original, campos ausentes, URL válida |
| S2-03 | Fontes e sincronizações | Último status por fonte e histórico básico |
| S2-04 | Resiliência e concorrência | Timeouts, retries, erro parcial, proteção contra duplicação |
| S2-05 | Testes e documentação | TA-01 a TA-12 e README reproduzível |

Os períodos são estimativas, não datas prometidas. A prioridade é entregar uma fatia vertical utilizável antes de aumentar o número de fontes.

## 13.4 Backlog pós-MVP resumido

- **Etapa 2:** agendador, regras de relevância, preferências mínimas, Telegram, deduplicação de alertas, auditoria.
- **Etapa 3:** dashboards, favoritos, Kanban, histórico de candidatura, filtros avançados e autenticação antes de publicar.
- **Etapa 4:** alertas oficiais de e-mail, importação manual, monitoramento de programas/prazos, novas fontes permitidas.
- **Etapa 5:** perfil/currículo, classificação semântica, evidências da análise, avaliação de qualidade e controle de custo/privacidade.

# 14. Definições de pronto e gestão de mudanças

## 14.1 Definition of Ready (DoR)

Uma tarefa só deve entrar em implementação quando houver: objetivo claro; IDs de requisitos/histórias envolvidos; entradas e saídas esperadas; dependências identificadas; pelo menos um teste de aceite; e confirmação de que está no escopo da fase atual.

## 14.2 Definition of Done (DoD)

Uma tarefa só pode ser marcada concluída quando:

1. Código implementado conforme requisitos, sem funcionalidade fora de escopo.
2. Tipagem, lint e build sem erros.
3. Testes unitários/integrados relevantes passando.
4. Erros e estados vazios tratados.
5. Sem credenciais em repositório, logs ou respostas da API.
6. Documentação atualizada quando contrato, comandos ou arquitetura mudarem.
7. Revisão manual básica do fluxo realizada.
8. Resumo das alterações, decisões e limitações registrado no PR/commit.

## 14.3 Regra para mudanças de escopo

Qualquer necessidade não prevista deve gerar proposta curta contendo **problema, impacto, opções e recomendação**. Não implementar automaticamente uma expansão apenas porque o agente identifica uma melhoria possível. Mudanças de escopo precisam ser aprovadas pelo responsável pelo projeto e refletidas na versão deste documento.

## 14.4 Registro de decisões arquiteturais (ADRs)

Criar em `/docs/decisions/` decisões sucintas, por exemplo:

- `ADR-001-monorepo-e-monolito-modular.md`
- `ADR-002-postgresql-prisma.md`
- `ADR-003-coleta-por-apis-publicas.md`
- `ADR-004-contrato-dos-conectores.md`
- `ADR-005-politica-de-datas-e-status.md`

# 15. Instruções de execução para o Codex

O texto abaixo pode constar no repositório como orientação permanente ao agente:

> Você está trabalhando no projeto **InternRadar**. Leia integralmente `docs/requirements.md` e o README antes de alterar o código. A versão atual é focada no **MVP da Etapa 1**. Não implemente, sem autorização explícita, notificações, agendamento, IA, perfis de usuário, autenticação pública, Kanban, integração com Gmail ou scraping de portais. Trabalhe em incrementos pequenos, mapeie cada alteração aos IDs de requisito/história, mantenha os contratos estáveis, crie ou atualize testes, execute as verificações disponíveis e informe arquivos alterados, comandos executados, resultados e pendências. Não invente respostas das APIs; use fixtures claramente identificadas em testes. Para mudanças de arquitetura ou ambiguidades da especificação, proponha alternativas antes de alterar significativamente o projeto.

## 15.1 Modelo de solicitação de tarefa

```text
Tarefa: [S1-02] Implementar conector Greenhouse.

Contexto:
- Leia docs/requirements.md, especialmente HU-03, RN-003 a RN-015 e seção 7.
- O projeto está na Etapa 1 (MVP).

Escopo:
- Implementar somente consulta e normalização Greenhouse.
- Adicionar fixtures, testes de sucesso/erro e documentação mínima.
- Não implementar scheduler, alertas ou frontend extra.

Critérios de aceite:
- HU-03 e TA-03 atendidos.
- Campos opcionais não são inventados.
- O conector não persiste dados diretamente.
- Lint, typecheck e testes pertinentes passam.

Antes de executar:
- Inspecione a estrutura existente.
- Apresente plano curto e a lista de arquivos previstos.

Depois de executar:
- Resuma mudanças, testes e eventuais limitações.
```

## 15.2 Política de trabalho com agentes

- Não permitir alterações massivas não revisadas em uma só execução.
- Criar commits pequenos e descritivos por funcionalidade.
- Verificar manualmente migrações de banco e scripts com efeitos destrutivos.
- Não permitir que a ausência de uma API externa leve o agente a produzir dados artificiais em ambiente de produção.
- Se houver dúvida sobre requisitos, parar e registrar a questão, em vez de supor uma mudança estrutural.

# 16. Matriz de rastreabilidade resumida

| Entrega | História | Requisitos | Testes |
|---|---|---|---|
| Ambiente + migrações | HU-01 | RF-001, 002, 018 | TA-01 |
| Configuração de fontes | HU-02 | RF-002, 003 | TA-02 |
| Coleta Greenhouse | HU-03 | RF-004, 007–012 | TA-03 |
| Coleta Ashby | HU-04 | RF-005, 007–012 | TA-04 |
| Coleta Lever | HU-05 | RF-006, 007–012 | TA-05 |
| Upsert e idempotência | HU-06 | RF-010, 011 | TA-06 |
| Listagem e filtros | HU-07 | RF-013, 014 | TA-07 |
| Detalhe e redirecionamento | HU-08 | RF-015, 016 | TA-08 |
| Auditoria das sincronizações | HU-09 | RF-009, 012, 019 | TA-09 |
| Interface | HU-10 | RF-013–017 | TA-10 |
| Tratamento de desconhecidos | HU-11 | RF-007, 015 | TA-11 |
| Qualidade e documentação | HU-12 | RF-001, 018 | TA-12 |

# 17. Riscos, dependências e mitigação

| Risco | Probabilidade / impacto | Mitigação |
|---|---|---|
| Empresa altera ou desativa board | Média / média | Conector isolado, logs, empresa alternativa e fixtures |
| Limite de requisições ou indisponibilidade | Média / média | Backoff, timeout, limite de concorrência, não apagar dados |
| Fonte não informa modalidade ou data | Alta / baixa | Campos nulos/UNKNOWN e interface transparente |
| Duplicidade entre fontes distintas | Média / média | Não fundir no MVP; melhoria futura com revisão |
| Escopo crescer cedo demais | Alta / alta | Etapas, IDs estáveis e aprovação prévia de mudanças |
| Consultas lentas com maior volume | Média / média | Paginação, índices e medição local |
| Vazamento de credenciais | Baixa / alta | `.env`, CI com segredos e revisão de commits |
| Expor ações sem autenticação na internet | Média / alta | Restringir ambiente local; bloquear deploy remoto do endpoint administrativo |
| Inconsistência da documentação externa | Média / média | Validar payload real, manter fixtures e revisar docs |
| Falta de tempo de desenvolvimento | Alta / média | Entregas verticais pequenas e MVP sem IA/agendamento |

# 18. Questões em aberto e decisões propostas

| ID | Questão | Padrão proposto até revisão |
|---|---|---|
| Q-01 | Qual gerenciador de pacotes? | `pnpm` com workspaces |
| Q-02 | Qual versão Node.js? | LTS ativa compatível com Next.js, NestJS e Prisma na data da instalação; fixar no repositório |
| Q-03 | Quais empresas para o seed inicial? | Selecionar 1–2 boards reais e válidos por plataforma, documentando a escolha; nunca inventar identificadores |
| Q-04 | Acionamento manual: CLI ou API? | CLI primeiro; endpoint administrativo somente se protegível localmente |
| Q-05 | Dados do HTML das descrições? | Converter/sanitizar para texto seguro no MVP |
| Q-06 | Hospedagem? | Não decidir antes de concluir Etapa 2 |
| Q-07 | Dashboard e ranking inicial? | Adiar para Etapas 2 e 3; no MVP ordenar por `firstSeenAt` |
| Q-08 | Política de reimportação e ausência? | Upsert idempotente e nenhuma inferência automática de fechamento no MVP |
| Q-09 | Autenticação? | Sem login em localhost; obrigatória antes de exposição pública |
| Q-10 | Licença do repositório? | Decidir conscientemente antes de abrir código e dados; não pressupor licença pública |

# 19. Checklist final de homologação do MVP

- [ ] Projeto inicia em instalação limpa seguindo o README.
- [ ] PostgreSQL, migrações e seed funcionam e podem ser reexecutados.
- [ ] Fonte Greenhouse válida é consultada; erros são testados.
- [ ] Fonte Ashby válida é consultada; erros são testados.
- [ ] Fonte Lever válida é consultada; paginação e erros são testados.
- [ ] Toda vaga mostra ID interno, origem, título e URL de anúncio válida.
- [ ] Campos ausentes não são inventados.
- [ ] Segunda sincronização não cria duplicatas para a mesma fonte.
- [ ] `firstSeenAt` permanece imutável; `lastSeenAt` é atualizado corretamente.
- [ ] Falha de fonte não apaga vagas existentes.
- [ ] Histórico da sincronização apresenta status, tempos e contadores.
- [ ] API filtra por texto, localização, fonte/plataforma e modalidade.
- [ ] Busca é paginada e ordenada de forma determinística.
- [ ] Frontend lista resultados, abre detalhe e fornece link original.
- [ ] Interface diferencia vazio, erro e carregamento.
- [ ] Interface é navegável em desktop e celular.
- [ ] Endpoint administrativo não é publicamente acessível sem autenticação.
- [ ] Lint, typecheck, build e testes passam.
- [ ] Nenhum segredo ou dado pessoal aparece em repositório ou logs.
- [ ] Documentação e limitações estão atualizadas.

# Apêndice A — Referências oficiais

Consultadas em **10/10/2026**; conferir novamente durante a implementação.

1. Greenhouse — Job Board API: <https://docs.greenhouse.io/job-board.html>
2. Ashby — Public Job Postings API: <https://developers.ashbyhq.com/docs/public-job-posting-api>
3. Lever — Postings API: <https://github.com/lever/postings-api>
4. LinkedIn — User Agreement: <https://www.linkedin.com/legal/user-agreement>
5. LinkedIn — Proibição de scraping/automação não autorizada: <https://www.linkedin.com/help/linkedin/answer/a1341387/prohibition-of-scraping-software>
6. Prisma — Guia de integração com NestJS: <https://www.prisma.io/docs/guides/v7/frameworks/nestjs>

# Apêndice B — Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 1.0 | 10/10/2026 | Criação da especificação inicial: escopo, histórias, regras, RNFs, arquitetura funcional, dados, API, testes e roadmap |

---

**Regra final de governança:** o objetivo do InternRadar não é acumular tecnologias; é entregar um produto confiável que **economize tempo na busca de estágios** e demonstre domínio prático de **Engenharia de Software e Desenvolvimento Full Stack**. Toda decisão técnica deve contribuir para pelo menos um desses objetivos.
