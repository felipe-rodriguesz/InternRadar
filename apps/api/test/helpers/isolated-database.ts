import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { Client } from 'pg';
import { loadEnvironment, validDatabaseUrl, workspaceRoot } from '../../src/config/environment';
import { createDatabaseClient } from '../../src/database/client';

/** Only creates new schemas, after checking the distinct test cluster. Never resets or drops. */
export async function isolatedDatabase(purpose: 'jobs' | 'browser') {
  const env = loadEnvironment();
  const value = process.env.TEST_DATABASE_URL;
  assert(value && validDatabaseUrl(value), 'TEST_DATABASE_URL local é obrigatória.');
  const target = new URL(value);
  assert.notEqual(target.host, new URL(env.DATABASE_URL).host, 'Testes exigem outra instância.');
  assert.equal(decodeURIComponent(target.pathname.slice(1)), process.env.POSTGRES_TEST_DB);
  assert.equal(target.port, process.env.POSTGRES_TEST_PORT ?? '5433');
  const dev = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  const test = new Client({ connectionString: value, connectionTimeoutMillis: 3000 });
  const snapshotSql =
    'SELECT (SELECT count(*) FROM "Company")::int AS companies, (SELECT count(*) FROM "JobSource")::int AS sources, (SELECT count(*) FROM "Job")::int AS jobs, (SELECT count(*) FROM "SyncRun")::int AS runs';
  try {
    await dev.connect();
    await test.connect();
    const devId = (
      await dev.query<{ id: string }>('SELECT system_identifier AS id FROM pg_control_system()')
    ).rows[0]?.id;
    const testId = (
      await test.query<{ id: string }>('SELECT system_identifier AS id FROM pg_control_system()')
    ).rows[0]?.id;
    assert(devId && testId && devId !== testId, 'Clusters devem ser distintos.');
    const before = (await dev.query(snapshotSql)).rows;
    const schema = `${purpose}_${randomUUID().replaceAll('-', '')}`;
    assert.match(schema, /^(jobs|browser)_[a-f0-9]{32}$/);
    await test.query(`CREATE SCHEMA "${schema}"`);
    target.searchParams.set('schema', schema);
    const url = target.toString();
    const migration = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: join(workspaceRoot(), 'apps/api'),
      env: { ...process.env, DATABASE_URL: url },
      encoding: 'utf8',
      timeout: 90000,
    });
    assert.equal(migration.status, 0, 'Migração isolada falhou (saída privada não publicada).');
    const prisma = createDatabaseClient(url);
    await prisma.$connect();
    console.log(`Schema isolado novo, preservado ao concluir: ${schema}`);
    return {
      url,
      schema,
      prisma,
      async close() {
        try {
          await prisma.$disconnect();
          assert.deepEqual(
            (await dev.query(snapshotSql)).rows,
            before,
            'Contagens do banco diário devem permanecer intactas.',
          );
        } finally {
          await test.end();
          await dev.end();
        }
      },
    };
  } catch (error) {
    await test.end();
    await dev.end();
    throw error;
  }
}
