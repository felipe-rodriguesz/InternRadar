import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { config } from 'dotenv';
import { z } from 'zod';

export function workspaceRoot(start = __dirname): string {
  let directory = start;
  while (!existsSync(join(directory, 'pnpm-workspace.yaml'))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Workspace não encontrado.');
    directory = parent;
  }
  return directory;
}

function localOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      url.origin === value
    );
  } catch {
    return false;
  }
}

export function validDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      !!url.username &&
      !!url.password &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

const schema = z.object({
  DATABASE_URL: z.string().refine(validDatabaseUrl),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.literal('127.0.0.1').default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://127.0.0.1:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .refine((origins) => origins.length > 0 && origins.every(localOrigin)),
});

export type Environment = z.infer<typeof schema>;
export const ENVIRONMENT = Symbol('ENVIRONMENT');

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Configuração inválida: ${keys.join(', ')}.`);
  }
  return result.data;
}

export function loadEnvironment(): Environment {
  config({ path: join(workspaceRoot(), '.env'), quiet: true });
  return validateEnvironment(process.env);
}
