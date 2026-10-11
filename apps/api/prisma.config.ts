import { join } from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';
import { workspaceRoot } from './src/config/environment';

config({ path: join(workspaceRoot(), '.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
});
