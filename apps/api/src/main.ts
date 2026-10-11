import process from 'node:process';
import console from 'node:console';
import { createApplication } from './application';
import { ENVIRONMENT } from './config/environment';
import type { Environment } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const env = app.get<Environment>(ENVIRONMENT);
  await app.listen(env.API_PORT, env.API_HOST);
}

void bootstrap().catch(() => {
  console.error(
    'Falha ao iniciar a API. Verifique o ambiente privado e a disponibilidade dos serviços.',
  );
  process.exitCode = 1;
});
