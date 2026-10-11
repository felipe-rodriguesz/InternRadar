import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { join } from 'node:path';
import process from 'node:process';
import { after, before, test } from 'node:test';
import { Client } from 'pg';
import { loadEnvironment, validDatabaseUrl, workspaceRoot } from '../src/config/environment';
import { createDatabaseClient } from '../src/database/client';
import type { PrismaClient } from '../src/generated/prisma/client';
import { seedDatabase } from '../prisma/seed-core';
import { seedSources } from '../prisma/seed-data';

const schema = `check_${randomUUID().replaceAll('-', '')}`;
let prisma: PrismaClient;
let testSql: Client;
let development: Client;
let sourceId: string;
let companyId: string;
let jobId: string;
let firstSeenAt: Date;
let devTables: unknown[];
let devCounts: unknown[];

before(async () => {
  const environment = loadEnvironment();
  const url = process.env.TEST_DATABASE_URL;
  assert(url && validDatabaseUrl(url), 'Defina TEST_DATABASE_URL local válida.');
  const target = new URL(url);
  const devTarget = new URL(environment.DATABASE_URL);
  assert.notEqual(target.host, devTarget.host, 'Testes exigem outra instância/porta.');
  assert.equal(
    decodeURIComponent(target.pathname.slice(1)),
    process.env.POSTGRES_TEST_DB,
    'Banco diferente do POSTGRES_TEST_DB configurado.',
  );
  assert.equal(
    target.port,
    process.env.POSTGRES_TEST_PORT ?? '5433',
    'Porta diferente de POSTGRES_TEST_PORT.',
  );
  development = new Client({
    connectionString: environment.DATABASE_URL,
    connectionTimeoutMillis: 3000,
  });
  testSql = new Client({ connectionString: url, connectionTimeoutMillis: 3000 });
  await development.connect();
  await testSql.connect();
  const devId = (
    await development.query<{ system_identifier: string }>(
      'SELECT system_identifier FROM pg_control_system()',
    )
  ).rows[0]?.system_identifier;
  const testId = (
    await testSql.query<{ system_identifier: string }>(
      'SELECT system_identifier FROM pg_control_system()',
    )
  ).rows[0]?.system_identifier;
  assert(devId && testId);
  assert.notEqual(testId, devId, 'O cluster de testes não pode ser o de desenvolvimento.');
  devTables = (
    await development.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2",
    )
  ).rows;
  devCounts = (
    await development.query(
      'SELECT (SELECT count(*) FROM "Company") AS companies, (SELECT count(*) FROM "JobSource") AS sources, (SELECT count(*) FROM "Job") AS jobs, (SELECT count(*) FROM "SyncRun") AS runs',
    )
  ).rows;
  // Identificador gerado internamente e validado; nenhum schema existente é reutilizado.
  assert.match(schema, /^check_[a-f0-9]{32}$/);
  await testSql.query(`CREATE SCHEMA "${schema}"`);
  target.searchParams.set('schema', schema);
  const migrated = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: join(workspaceRoot(), 'apps/api'),
    env: { ...process.env, DATABASE_URL: target.toString() },
    encoding: 'utf8',
    timeout: 90000,
  });
  assert.equal(
    migrated.status,
    0,
    'Migração no schema vazio falhou; execute db:migrate:status para diagnosticar.',
  );
  prisma = createDatabaseClient(target.toString());
  await prisma.$connect();
  console.log(`Persistência real no cluster separado; schema novo preservado: ${schema}`);
});

after(async () => {
  await prisma?.$disconnect();
  await testSql?.end();
  await development?.end();
});

test('migração em destino vazio e seed repetido preservam IDs, totais e enabled=false', async () => {
  assert.equal(await prisma.company.count(), 0);
  assert.equal(await prisma.jobSource.count(), 0);
  await seedDatabase(prisma);
  const first = await prisma.jobSource.findMany({ orderBy: { id: 'asc' } });
  const disabled = first[0];
  assert(disabled);
  await prisma.jobSource.update({ where: { id: disabled.id }, data: { enabled: false } });
  await seedDatabase(prisma);
  assert.equal(await prisma.company.count(), seedSources.length);
  const repeated = await prisma.jobSource.findMany({ orderBy: { id: 'asc' } });
  assert.deepEqual(
    repeated.map((source) => source.id),
    first.map((source) => source.id),
  );
  assert.equal(repeated.find((source) => source.id === disabled.id)?.enabled, false);
});

test('UUIDs, relações, região/defaults e datas opcionais são persistidos corretamente', async () => {
  // Fixtures identificadas: existem somente no schema de testes, nunca no seed real.
  const company = await prisma.company.create({ data: { name: 'Fixture S0-05 — isolada' } });
  companyId = company.id;
  const source = await prisma.jobSource.create({
    data: { companyId, platform: 'GREENHOUSE', boardKey: 'fixture-s0-05' },
  });
  sourceId = source.id;
  assert.equal(source.region, 'GLOBAL');
  assert.equal(source.enabled, true);
  const job = await prisma.job.create({
    data: {
      jobSourceId: sourceId,
      externalId: 'fixture-1',
      title: 'Fixture de persistência',
      jobUrl: 'https://example.com/fixture',
    },
  });
  jobId = job.id;
  firstSeenAt = job.firstSeenAt;
  for (const id of [companyId, sourceId, jobId])
    assert.match(id, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
  assert.equal(job.publishedAt, null);
  assert.equal(job.description, null);
  assert.equal(job.location, null);
  assert.equal(job.employmentType, null);
  assert.equal(job.workplaceType, 'UNKNOWN');
  assert.equal(job.status, 'ACTIVE');
  const loaded = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { source: { include: { company: true } } },
  });
  assert.equal(loaded.source.company.id, companyId);
});

test('unicidade global da fonte também vale entre empresas; região é obrigatória', async () => {
  const other = await prisma.company.create({ data: { name: 'Outra fixture isolada' } });
  await assert.rejects(
    prisma.jobSource.create({
      data: { companyId: other.id, platform: 'GREENHOUSE', boardKey: 'fixture-s0-05' },
    }),
    { code: 'P2002' },
  );
  await assert.rejects(
    prisma.$executeRaw`UPDATE "JobSource" SET "region" = NULL WHERE "id" = ${sourceId}::uuid`,
  );
});

test('unicidade de vaga por fonte e upsert concorrente preservam firstSeenAt', async () => {
  const identity = { jobSourceId: sourceId, externalId: 'fixture-1' };
  const create = { ...identity, title: 'Fixture', jobUrl: 'https://example.com/fixture' };
  await assert.rejects(prisma.job.create({ data: create }), { code: 'P2002' });
  await Promise.all(
    [1, 2].map(() =>
      prisma.job.upsert({
        where: { jobSourceId_externalId: identity },
        create,
        update: { title: 'Atualizada', lastSeenAt: new Date() },
      }),
    ),
  );
  assert.equal(await prisma.job.count({ where: identity }), 1);
  const current = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  assert.equal(current.firstSeenAt.toISOString(), firstSeenAt.toISOString());
  assert.equal(current.publishedAt, null);
  await assert.rejects(
    prisma.job.update({ where: { id: jobId }, data: { firstSeenAt: new Date(0) } }),
  );
  const other = await prisma.jobSource.create({
    data: { companyId, platform: 'LEVER', boardKey: 'fixture-s0-05' },
  });
  await prisma.job.create({ data: { ...create, jobSourceId: other.id } });
  assert.equal(await prisma.job.count({ where: { externalId: 'fixture-1' } }), 2);
});

test('foreign keys e exclusões restritas protegem empresas, fontes, vagas e execuções', async () => {
  const missing = randomUUID();
  await assert.rejects(
    prisma.jobSource.create({
      data: { companyId: missing, platform: 'ASHBY', boardKey: 'fixture' },
    }),
    { code: 'P2003' },
  );
  await assert.rejects(
    prisma.job.create({
      data: {
        jobSourceId: missing,
        externalId: 'fixture',
        title: 'Fixture',
        jobUrl: 'https://example.com/fixture',
      },
    }),
    { code: 'P2003' },
  );
  await assert.rejects(prisma.syncRun.create({ data: { jobSourceId: missing } }), {
    code: 'P2003',
  });
  await assert.rejects(prisma.company.delete({ where: { id: companyId } }), { code: 'P2003' });
  await assert.rejects(prisma.jobSource.delete({ where: { id: sourceId } }), { code: 'P2003' });
});

test('PostgreSQL rejeita enums inválidos, campos vazios e URLs fora de http(s)', async () => {
  const [row] = await prisma.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Job" WHERE "id" = ${jobId}::uuid`;
  assert.equal(row?.id, jobId, 'SQL bruto deve usar o schema de teste.');
  await assert.rejects(
    prisma.$executeRaw`UPDATE "Job" SET "status" = 'INVALID' WHERE "id" = ${jobId}::uuid`,
  );
  await assert.rejects(
    prisma.$executeRaw`UPDATE "Job" SET "workplaceType" = 'INVALID' WHERE "id" = ${jobId}::uuid`,
  );
  await assert.rejects(prisma.job.update({ where: { id: jobId }, data: { title: '   ' } }));
  await assert.rejects(
    prisma.job.update({ where: { id: jobId }, data: { jobUrl: 'javascript:alert(1)' } }),
  );
  await assert.rejects(prisma.company.create({ data: { name: ' ' } }));
});

test('SyncRun mantém contadores não negativos e datas opcionais honestas', async () => {
  const run = await prisma.syncRun.create({ data: { jobSourceId: sourceId } });
  assert.equal(run.status, 'RUNNING');
  assert.equal(run.finishedAt, null);
  assert.equal(run.errorCode, null);
  assert.equal(run.errorMessage, null);
  for (const counter of ['fetchedCount', 'createdCount', 'updatedCount', 'skippedCount'] as const) {
    assert.equal(run[counter], 0);
    await assert.rejects(prisma.syncRun.update({ where: { id: run.id }, data: { [counter]: -1 } }));
  }
  const finished = await prisma.syncRun.update({
    where: { id: run.id },
    data: { status: 'SUCCESS', finishedAt: new Date(), fetchedCount: 1, createdCount: 1 },
  });
  assert.equal(finished.status, 'SUCCESS');
  assert(finished.finishedAt);
});

test('escritas de teste não alteraram as tabelas do cluster de desenvolvimento', async () => {
  const schemas = await development.query(
    'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
    [schema],
  );
  assert.equal(schemas.rowCount, 0);
  const now = (
    await development.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2",
    )
  ).rows;
  assert.deepEqual(now, devTables);
  const counts = (
    await development.query(
      'SELECT (SELECT count(*) FROM "Company") AS companies, (SELECT count(*) FROM "JobSource") AS sources, (SELECT count(*) FROM "Job") AS jobs, (SELECT count(*) FROM "SyncRun") AS runs',
    )
  ).rows;
  assert.deepEqual(counts, devCounts);
});
