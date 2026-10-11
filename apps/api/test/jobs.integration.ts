import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { before, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { isolatedDatabase } from './helpers/isolated-database';
import { SyncService } from '../src/sync/sync.service';
import { createApplication } from '../src/application';
import { IntegrationError } from '../src/connectors/integration-error';
import { normalizeGreenhouse } from '../src/connectors/greenhouse/greenhouse-normalizer';
import type { CollectionResult, JobConnector, NormalizedJob } from '../src/connectors/contracts';

let db: Awaited<ReturnType<typeof isolatedDatabase>>;
let app: INestApplication;
let base: string;
let companyId: string;
let sourceId: string;
let result: CollectionResult;
let collect: () => Promise<CollectionResult>;
const connector: JobConnector = { platform: 'GREENHOUSE', fetchJobs: () => collect() };
let sync: SyncService;
const job: NormalizedJob = {
  externalId: 'synthetic-1',
  title: 'Fixture Software Intern',
  description: 'Fixture engenharia de software',
  location: 'Curitiba, Brasil',
  workplaceType: 'REMOTE',
  employmentType: 'Intern',
  jobUrl: 'https://example.com/jobs/synthetic-1',
  publishedAt: null,
};
function collection(jobs: NormalizedJob[]): CollectionResult {
  return {
    jobs,
    receivedCount: jobs.length,
    acceptedCount: jobs.length,
    rejectedCount: 0,
    rejected: [],
    warnings: [],
    attempts: 1,
  };
}
before(async () => {
  db = await isolatedDatabase('jobs');
  const old = process.env.DATABASE_URL;
  process.env.DATABASE_URL = db.url;
  try {
    app = await createApplication(false);
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api/v1`;
  } finally {
    if (old === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = old;
  }
  companyId = (
    await db.prisma.company.create({ data: { name: 'Fixture S1 — não é empresa real' } })
  ).id;
  sourceId = (
    await db.prisma.jobSource.create({
      data: { companyId, platform: 'GREENHOUSE', boardKey: 'fixture-s1' },
    })
  ).id;
  sync = new SyncService(db.prisma, connector);
  result = collection([job]);
  collect = () => Promise.resolve(result);
});
after(async () => {
  await app?.close();
  await db?.close();
});
type Page = {
  items: {
    id: string;
    title: string;
    company: { name: string };
    source: { id: string; platform: string };
    firstSeenAt: string;
    publishedAt: string | null;
    location: string | null;
    jobUrl: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
};
async function get(query = '') {
  const response = await fetch(`${base}/jobs${query}`);
  assert.equal(response.status, 200);
  return (await response.json()) as Page;
}

test('HTTP vazio real e sincronização inicial registrada com contadores', async () => {
  assert.deepEqual(await get(), { items: [], page: 1, pageSize: 20, total: 0 });
  collect = async () => {
    const running = await db.prisma.syncRun.findFirstOrThrow({ where: { jobSourceId: sourceId } });
    assert.equal(running.status, 'RUNNING');
    assert.equal(running.finishedAt, null);
    return result;
  };
  const run = await sync.synchronize(sourceId);
  assert.equal(run.status, 'SUCCESS');
  assert('createdCount' in run);
  assert.equal(run.createdCount, 1);
  assert.equal(run.fetchedCount, 1);
  assert.equal(run.updatedCount, 0);
  assert.equal(run.skippedCount, 0);
  assert(run.finishedAt);
  collect = () => Promise.resolve(result);
});
test('repetição e atualização preservam firstSeenAt, avançam lastSeenAt e limpam opcionais ausentes', async () => {
  const first = await db.prisma.job.findFirstOrThrow();
  result = collection([
    {
      ...job,
      title: 'Fixture Backend Intern',
      location: null,
      description: null,
      workplaceType: 'UNKNOWN',
      employmentType: null,
    },
  ]);
  const run = await sync.synchronize(sourceId);
  assert('updatedCount' in run);
  assert.equal(run.updatedCount, 1);
  assert.equal(run.createdCount, 0);
  const now = await db.prisma.job.findFirstOrThrow();
  assert.equal(now.id, first.id);
  assert.deepEqual(now.firstSeenAt, first.firstSeenAt);
  assert(now.lastSeenAt > first.lastSeenAt);
  assert.equal(now.location, null);
  assert.equal(now.publishedAt, null);
  assert.equal(now.description, null);
  assert.equal(now.workplaceType, 'UNKNOWN');
});
test('concorrência real em transações distintas mantém uma linha e contadores exatos', async () => {
  result = collection([{ ...job, externalId: 'concurrent' }]);
  const runs = await Promise.all([sync.synchronize(sourceId), sync.synchronize(sourceId)]);
  assert(runs.every((run) => run.status === 'SUCCESS'));
  assert.equal(
    runs.reduce((n, run) => n + ('createdCount' in run ? run.createdCount : 0), 0),
    1,
  );
  assert.equal(await db.prisma.job.count({ where: { externalId: 'concurrent' } }), 1);
});
test('vazio válido não fecha nem altera lastSeenAt de anúncios anteriores', async () => {
  const before = await db.prisma.job.findMany({ orderBy: { id: 'asc' } });
  result = collection([]);
  const run = await sync.synchronize(sourceId);
  assert.equal(run.status, 'SUCCESS');
  assert('fetchedCount' in run);
  assert.equal(run.fetchedCount, 0);
  assert.deepEqual(await db.prisma.job.findMany({ orderBy: { id: 'asc' } }), before);
});
test('itens inválidos, duplicados e boundary inválida são contabilizados sem payload bruto', async () => {
  result = normalizeGreenhouse(
    JSON.parse(
      readFileSync(join(__dirname, 'fixtures/greenhouse/mixed-invalid.json'), 'utf8'),
    ) as unknown,
    1,
  );
  const expected = result;
  let run = await sync.synchronize(sourceId);
  assert.equal(run.status, 'SUCCESS');
  assert('skippedCount' in run);
  assert.equal(run.skippedCount, expected.rejectedCount);
  assert.equal(run.fetchedCount, expected.receivedCount);
  result = collection([job, job, { ...job, externalId: 'unsafe', jobUrl: 'javascript:alert(1)' }]);
  run = await sync.synchronize(sourceId);
  assert('skippedCount' in run);
  assert.equal(run.skippedCount, 2);
  result = { ...collection([job]), receivedCount: 99 };
  run = await sync.synchronize(sourceId);
  assert.equal(run.status, 'FAILED');
  assert('errorCode' in run);
  assert.equal(run.errorCode, 'INVALID_COLLECTION');
});
test('falha integral preserva vagas, classifica erros e mantém outras fontes independentes', async () => {
  const before = await db.prisma.job.findMany({ orderBy: { id: 'asc' } });
  for (const code of ['RATE_LIMITED', 'TIMEOUT', 'UPSTREAM_SERVER_ERROR'] as const) {
    collect = () => Promise.reject(new IntegrationError(code));
    const run = await sync.synchronize(sourceId);
    assert.equal(run.status, 'FAILED');
    assert('errorCode' in run);
    assert.equal(run.errorCode, code);
    assert.equal(run.createdCount, 0);
  }
  collect = () => Promise.reject(new Error('secret password payload must not leak'));
  const run = await sync.synchronize(sourceId);
  assert(!JSON.stringify(run).includes('secret'));
  assert.deepEqual(await db.prisma.job.findMany({ orderBy: { id: 'asc' } }), before);
  collect = () => Promise.resolve(collection([job]));
});
test('falha SQL real desfaz todo o lote e finaliza FAILED, sem contadores de gravações revertidas', async () => {
  // Adds a fault only to this new isolated test schema; no product migration or existing data changed.
  await db.prisma.$executeRawUnsafe(
    `CREATE FUNCTION reject_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = 'Fixture DB failure' THEN RAISE EXCEPTION 'synthetic persistence failure'; END IF; RETURN NEW; END $$`,
  );
  await db.prisma.$executeRawUnsafe(
    `CREATE TRIGGER reject_fixture BEFORE INSERT OR UPDATE ON "Job" FOR EACH ROW EXECUTE FUNCTION reject_fixture()`,
  );
  collect = () =>
    Promise.resolve(
      collection([
        { ...job, externalId: 'rollback-1' },
        { ...job, externalId: 'rollback-2', title: 'Fixture DB failure' },
      ]),
    );
  const run = await sync.synchronize(sourceId);
  assert.equal(run.status, 'FAILED');
  assert('errorCode' in run);
  assert.equal(run.errorCode, 'PERSISTENCE_ERROR');
  assert.equal(run.createdCount, 0);
  assert.equal(run.updatedCount, 0);
  assert.equal(
    await db.prisma.job.count({ where: { externalId: { startsWith: 'rollback-' } } }),
    0,
  );
});
test('fonte desativada é ignorada; global respeita enabled e falha de plataforma sem impedir sucesso', async () => {
  await db.prisma.jobSource.update({ where: { id: sourceId }, data: { enabled: false } });
  const before = await db.prisma.syncRun.count();
  assert.equal((await sync.synchronize(sourceId)).status, 'SKIPPED');
  assert.equal(await db.prisma.syncRun.count(), before);
  const active = await db.prisma.jobSource.create({
    data: { companyId, platform: 'GREENHOUSE', boardKey: 'fixture-other' },
  });
  await db.prisma.jobSource.create({
    data: { companyId, platform: 'LEVER', boardKey: 'fixture-unsupported' },
  });
  collect = () => Promise.resolve(collection([job]));
  const results = await sync.synchronizeAll(1);
  assert.equal(results.length, 2);
  assert(results.some((run) => run.status === 'SUCCESS'));
  assert(results.some((run) => 'errorCode' in run && run.errorCode === 'UNSUPPORTED_PLATFORM'));
  assert.equal(
    await db.prisma.job.count({ where: { jobSourceId: active.id, externalId: job.externalId } }),
    1,
  );
  assert.equal(await db.prisma.job.count({ where: { externalId: job.externalId } }), 2);
  await assert.rejects(sync.synchronize(randomUUID()), { code: 'SOURCE_NOT_FOUND' });
});
test('HTTP busca literal/case-insensitive em título/descrição e filtros individuais/combinados', async () => {
  const s = await db.prisma.jobSource.create({
    data: { companyId, platform: 'ASHBY', boardKey: 'fixture-query' },
  });
  await db.prisma.job.create({
    data: {
      ...job,
      jobSourceId: s.id,
      externalId: 'query',
      title: 'Fixture Pesquisa 100%_literal',
      description: 'Café Full Stack',
      location: 'São Paulo',
      workplaceType: 'HYBRID',
    },
  });
  for (const query of [
    'q=pesquisa',
    'q=CAF%C3%89',
    'q=100%25_literal',
    'platform=ASHBY',
    `sourceId=${s.id}`,
    'workplaceType=HYBRID',
    'location=paulo',
    'q=stack&platform=ASHBY&workplaceType=HYBRID&location=paulo',
  ])
    assert.equal((await get(`?${query}`)).total, 1, query);
  assert.equal((await get('?q=pesquisa&platform=GREENHOUSE')).total, 0);
  assert.equal((await get(`?sourceId=${randomUUID()}`)).total, 0);
});
test('HTTP paginação estável, página 2, unicidade, opcionais e contrato sem campos privados', async () => {
  const full = await get('?pageSize=100');
  const first = await get('?pageSize=2');
  const second = await get('?pageSize=2&page=2');
  assert.deepEqual(
    [...first.items, ...second.items].map((item) => item.id),
    full.items.slice(0, 4).map((item) => item.id),
  );
  assert.equal(first.total, full.total);
  assert.equal(second.page, 2);
  assert.equal(new Set(full.items.map((item) => item.id)).size, full.total);
  const sql = await db.prisma.job.findMany({ orderBy: [{ firstSeenAt: 'desc' }, { id: 'desc' }] });
  assert.deepEqual(
    full.items.map((item) => item.id),
    sql.map((item) => item.id),
  );
  assert(full.items.some((item) => item.publishedAt === null));
  for (const item of full.items) {
    assert(item.company.name);
    assert(item.source.platform);
    assert(!('boardKey' in item.source));
    assert(!('DATABASE_URL' in item));
  }
  assert.equal((await get('?page=999')).items.length, 0);
});
test('HTTP inválidos retornam 400 útil e não expõem consultas; sync não tem endpoint', async () => {
  for (const query of [
    'page=0',
    'pageSize=101',
    'sourceId=no',
    'platform=bad',
    'workplaceType=bad',
    'q=a&q=b',
    `q=${'a'.repeat(201)}`,
    `location=${'a'.repeat(101)}`,
  ]) {
    const response = await fetch(`${base}/jobs?${query}`);
    assert.equal(response.status, 400, query);
    const body = (await response.json()) as { code: string; message: string };
    assert.equal(body.code, 'INVALID_QUERY');
    assert(body.message.length > 10);
    assert(!JSON.stringify(body).includes('SELECT'));
  }
  assert.equal((await fetch(`${base}/sync-runs`, { method: 'POST' })).status, 404);
});
test('links legados inválidos não são devolvidos como acionáveis', async () => {
  const row = await db.prisma.job.findFirstOrThrow();
  await db.prisma.job.update({
    where: { id: row.id },
    data: { jobUrl: 'http://localhost/private' },
  });
  const response = await get('?pageSize=100');
  assert.equal(response.items.find((item) => item.id === row.id)?.jobUrl, null);
});

test('coleta anterior não regride lastSeenAt nem sobrescreve conteúdo mais recente', async () => {
  const current = await db.prisma.job.findFirstOrThrow({ where: { jobSourceId: sourceId } });
  const future = new Date(Date.now() + 60000);
  await db.prisma.jobSource.update({ where: { id: sourceId }, data: { enabled: true } });
  await db.prisma.job.update({
    where: { id: current.id },
    data: { title: 'Fixture mais recente', lastSeenAt: future },
  });
  collect = () => Promise.resolve(collection([{ ...job, externalId: current.externalId }]));
  const run = await sync.synchronize(sourceId);
  assert.equal(run.status, 'SUCCESS');
  assert('skippedCount' in run);
  assert.equal(run.skippedCount, 1);
  assert.equal(run.updatedCount, 0);
  const after = await db.prisma.job.findUniqueOrThrow({ where: { id: current.id } });
  assert.equal(after.title, 'Fixture mais recente');
  assert.deepEqual(after.lastSeenAt, future);
});

test('limite global é de duas coletas, configurável para uma', async () => {
  for (const boardKey of ['fixture-limit-a', 'fixture-limit-b', 'fixture-limit-c'])
    await db.prisma.jobSource.create({ data: { companyId, platform: 'GREENHOUSE', boardKey } });
  let running = 0;
  let maximum = 0;
  collect = async () => {
    running++;
    maximum = Math.max(maximum, running);
    await new Promise((resolve) => setTimeout(resolve, 25));
    running--;
    return collection([]);
  };
  await sync.synchronizeAll(2);
  assert.equal(maximum, 2);
  maximum = 0;
  await sync.synchronizeAll(1);
  assert.equal(maximum, 1);
});

test('falha real também ao finalizar permanece RUNNING e retorna erro, nunca sucesso', async () => {
  const source = await db.prisma.jobSource.create({
    data: { companyId, platform: 'GREENHOUSE', boardKey: 'fixture-finalization' },
  });
  assert.match(source.id, /^[a-f0-9-]+$/);
  await db.prisma.$executeRawUnsafe(
    `CREATE FUNCTION reject_finalization() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."jobSourceId" = '${source.id}'::uuid THEN RAISE EXCEPTION 'synthetic finalization failure'; END IF; RETURN NEW; END $$`,
  );
  await db.prisma.$executeRawUnsafe(
    'CREATE TRIGGER reject_finalization BEFORE UPDATE ON "SyncRun" FOR EACH ROW EXECUTE FUNCTION reject_finalization()',
  );
  collect = () => Promise.resolve(collection([job]));
  await assert.rejects(sync.synchronize(source.id), { code: 'FINALIZATION_FAILED' });
  const run = await db.prisma.syncRun.findFirstOrThrow({ where: { jobSourceId: source.id } });
  assert.equal(run.status, 'RUNNING');
  assert.equal(run.finishedAt, null);
  assert.equal(await db.prisma.job.count({ where: { jobSourceId: source.id } }), 0);
});
