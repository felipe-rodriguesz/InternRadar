import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export function databaseAdapter(connectionString: string) {
  const schema = new URL(connectionString).searchParams.get('schema') ?? 'public';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) throw new Error('Nome de schema inválido.');
  return new PrismaPg(
    {
      connectionString,
      options: `-c search_path=${schema}`,
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
      statement_timeout: 3000,
    },
    { schema },
  );
}

export function createDatabaseClient(connectionString: string) {
  return new PrismaClient({ adapter: databaseAdapter(connectionString) });
}
