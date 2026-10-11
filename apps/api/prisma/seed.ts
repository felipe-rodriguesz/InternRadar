import console from 'node:console';
import process from 'node:process';
import { loadEnvironment } from '../src/config/environment';
import { createDatabaseClient } from '../src/database/client';
import { seedDatabase } from './seed-core';

async function main(): Promise<void> {
  const client = createDatabaseClient(loadEnvironment().DATABASE_URL);
  try {
    await seedDatabase(client);
    console.log('Seed concluído: empresas/fontes verificadas; enabled existente preservado.');
  } finally {
    await client.$disconnect();
  }
}

void main().catch(() => {
  console.error('Seed falhou. Confira ambiente, migrações e conexão.');
  process.exitCode = 1;
});
