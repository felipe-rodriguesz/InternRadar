# ADR-007 — Versionamento e GitHub Flow

Status: aceito. Referências: HU-12; RNF-015/016; seções 14/15.

## Contexto

O projeto tem um desenvolvedor e precisa de rastreabilidade sem um fluxo de integração complexo.

## Decisão

Manter `main` estável, Issues por entrega vinculadas ao Milestone, branches temporárias, commits Conventional Commits e PRs para revisão. Lotes relacionados podem compartilhar branch/PR, com commits compreensíveis e `Closes #N` para cada Issue. Preferir rebase merge quando preservar commits individuais fizer sentido; o responsável autoriza a integração.

## Justificativa

Issue registra escopo e aceite; commits registram mudanças verificáveis; PR concentra diff, evidências e pendências. A S0-01 demonstrou o fluxo com três commits e merge linear.

## Consequências

- Conferir staging antes de cada commit; manter manifest e lockfile coerentes no histórico.
- Dependências diretas exatas; instalação com lockfile congelado.
- Revisão relata checks reais e distingue aplicações/CI ainda pendentes.
- Proteção obrigatória de branch será considerada após checks da S0-06 existirem e passarem.
- Não exigir revisor independente enquanto houver apenas um desenvolvedor.
- Especificação v1.0 permanece intacta; mudanças aprovadas são registradas separadamente antes de uma revisão versionada.
- Lotes autorizados podem avançar autonomamente nas subtarefas; mudanças importantes, risco de perda de dados e merge seguem aprovação do responsável.

## Alternativas consideradas

Git Flow com branches permanentes adicionaria manutenção. Commits diretos na main eliminariam a revisão. Squash permanece alternativa consciente, mas perderia os commits individuais escolhidos para esta etapa.

Procedimento e critérios: [CONTRIBUTING](../../CONTRIBUTING.md).
