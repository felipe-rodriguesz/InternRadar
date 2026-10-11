# Contribuindo com o InternRadar

Leia [requirements.md](docs/requirements.md), [alterações propostas](docs/requirements-proposed-changes.md) e os [ADRs](docs/architecture.md). Trabalhe somente no escopo atribuído; funcionalidades futuras dependem de aprovação.

## Preparar e verificar

Pré-requisitos: Git, Node 24.21.0, pnpm 12.12.0 e Docker Compose com daemon acessível. No Windows, o ambiente validado é Ubuntu/WSL2 com Docker Desktop integrado. Não misture instalações de dependências Windows e Linux no mesmo checkout.

Prepare ambiente privado, bancos, migrações/seed e browsers conforme o [README](README.md). A geração do client também é necessária para o lint com tipos da API:

```sh
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm workspace:list
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm test:integration
```

`db:verify` executa testes reais em um projeto Docker temporário independente, sem exigir `.env` diário. Consulte [docs/database.md](docs/database.md) para iniciar/parar os bancos de uso local. Prepare ambiente, migrações/seed e browsers conforme [README](README.md) antes dos testes de aplicação. A suíte db:verify cria volumes próprios e não precisa ser repetida para alterações comuns.

## Fluxo de trabalho

1. Vincule a tarefa a uma Issue com requisitos, escopo, aceite e Milestone.
2. Confirme árvore limpa; atualize main com `git pull --ff-only` e crie branch apropriada.
3. Implemente incrementos pequenos e atualize documentação junto dos comandos/contratos.
4. Execute checks pertinentes. Não substitua testes indisponíveis por comandos que sempre passam.
5. Confira `git diff`, segredos, staging e `git diff --cached --check` antes dos commits.
6. Use Conventional Commits, publique sem force push e abra PR com `Closes #N`, evidências e pendências.
7. Integre somente após revisão/autorização. Preserve branches quando sua exclusão não estiver autorizada.

Exemplos: `docs(adr): record local environment decisions`, `chore(db): configure local PostgreSQL`. Lotes relacionados podem compartilhar PR; manifests e lockfile devem permanecer coerentes em cada commit.

## Qualidade e testes

- ESLint procura problemas estáticos; Prettier define apresentação. `pnpm format <arquivos>` escreve somente nos caminhos indicados.
- TypeScript strict é obrigatório; configurações específicas Next.js/NestJS são herdadas da base.
- `docs/requirements.md` e `pnpm-lock.yaml` ficam fora do Prettier. Nunca altere manualmente o lockfile para esconder inconsistências.
- Dependências diretas têm versões exatas e pertencem ao pacote que as usa; ferramentas comuns ficam na raiz.
- Testes de conectores usarão fixtures identificadas; integração de dados usará PostgreSQL separado. Os testes atuais verificam saúde HTTP, interface e persistência real em schema novo no cluster separado.
- Typecheck, builds, migrações e seed são executáveis. CI será introduzida na S0-06 com os comandos reais correspondentes. Schemas de teste são preservados; não limpar automaticamente dados/volumes.

## Revisão

Informe problema/resultado, requisitos, comandos executados e limites. Não publique `.env`, tokens, chaves ou logs com senhas; os modelos contêm somente placeholders. Verifique impacto antes de comandos que apaguem dados/volumes. A licença continua uma decisão em aberto; não adicione uma por suposição.
