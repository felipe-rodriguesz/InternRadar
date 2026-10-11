# ADR-002 — PostgreSQL, Prisma e isolamento de dados

Status: aceito. Referências: RF-001/002; RNF-004; modelo da seção 8.

## Contexto

Empresas, fontes, vagas e execuções possuem relações e regras de unicidade. Desenvolvimento precisa de dados persistentes; testes precisam de uma instância independente.

## Decisão

Usar PostgreSQL local em Docker Compose e Prisma na major 7 na API. A S0-03 fixa `postgres:17.11-trixie` por digest OCI, com volumes e redes distintos para desenvolvimento e testes. Aplicativos Node executarão no host. A major 17 permite usar o layout estabelecido `/var/lib/postgresql/data`; upgrades de imagem serão mudanças explícitas e revisadas.

## Justificativa

Constraints e transações sustentam integridade. Compose reproduz a infraestrutura sem instalar PostgreSQL no sistema. Prisma fornecerá tipos e migrações versionadas quando a persistência da aplicação for introduzida.

## Consequências

- S0-03 cria somente os bancos; nenhuma entidade, migração ou seed do produto.
- S0-05 modelará `Company`, `JobSource`, `Job` e `SyncRun`.
- Fontes terão unicidade global `(platform, boardKey, region)` e região obrigatória com padrão `GLOBAL`.
- Vagas terão unicidade `(jobSourceId, externalId)`; seed idempotente preservará `enabled` já alterado.
- Formato CommonJS e cliente Prisma deverão gerar, compilar e executar juntos na S0-05 antes de serem consolidados.
- Senhas de inicialização não são reaplicadas automaticamente a volumes existentes; alteração de credenciais e upgrades exigem procedimento explícito e preservação dos dados.

## Alternativas consideradas

SQLite não reproduziria o banco e as constraints do ambiente alvo. PostgreSQL instalado diretamente reduziria a reprodução entre Windows/WSL/Linux. Um banco de testes dentro da instância de desenvolvimento permitiria erros de configuração afetarem o mesmo servidor.

## Revisão da imagem — 11/10/2026

O conteúdo local de `17.11-bookworm` apresentou entrypoint vazio também em container novo, sem alterações na camada gravável; o arquivo remoto do mesmo digest estava íntegro. Adotamos a variante oficial `17.11-trixie`, fixada em Compose, com a mesma versão do PostgreSQL e camadas sem digests compartilhados com a imagem anterior. Entrypoint, binários essenciais e inicialização SQL foram verificados; recursos antigos foram preservados.

Repetir o pull original reutilizava o cache inconsistente. Removê-lo exigiria intervenção sobre recursos preservados. Alpine acrescentaria mudança de libc, desnecessária para esta recuperação. Trixie mantém Debian/glibc, mas altera suas versões: clusters previamente inicializados exigem análise de collation e backup antes de qualquer migração. A homologação comprova volumes novos, não uma migração de dados Bookworm. [Evidências e limites](../postgresql-recovery.md).

Referência de imagem e layout: [Docker Official Image PostgreSQL](https://hub.docker.com/_/postgres). Execução e recuperação operacional: [banco local](../database.md).
