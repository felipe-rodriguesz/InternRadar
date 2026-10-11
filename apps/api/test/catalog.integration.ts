import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { before, after, test } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { isolatedDatabase } from './helpers/isolated-database';
import { createApplication } from '../src/application';
import { SyncService } from '../src/sync/sync.service';
import { ConnectorRegistry } from '../src/connectors/connector-registry';
import { GreenhouseConnector } from '../src/connectors/greenhouse/greenhouse.connector';
import { GreenhouseHttp } from '../src/connectors/greenhouse/greenhouse-http';
import { AshbyConnector } from '../src/connectors/ashby/ashby.connector';
import { LeverConnector } from '../src/connectors/lever/lever.connector';
import { PublicJobsHttp } from '../src/connectors/public-jobs-http';

let db: Awaited<ReturnType<typeof isolatedDatabase>>;
let app: INestApplication;
let base: string;
let company: string;
const sources: Record<string, string> = {};
let unlisted = false;
let failLever = false;
let sync: SyncService;
type Page = { items: Record<string, unknown>[]; total: number; page: number; pageSize: number };
async function get(path: string, status = 200): Promise<Record<string, unknown>> {
  const response = await fetch(`${base}/${path}`);
  assert.equal(response.status, status, path);
  return (await response.json()) as Record<string, unknown>;
}
const page = async (path: string) => (await get(path)) as unknown as Page;
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
  const deps = {
    fetch: async (url: URL) => {
      const platform = url.hostname.includes('ashby')
        ? 'ashby'
        : url.hostname.includes('lever')
          ? 'lever'
          : 'greenhouse';
      if (failLever && platform === 'lever')
        return new Response('private payload', { status: 403 });
      const payload = JSON.parse(
        readFileSync(join(__dirname, 'fixtures', platform, 'valid.json'), 'utf8'),
      ) as unknown;
      if (platform === 'ashby' && unlisted)
        (payload as { jobs: { isListed: boolean }[] }).jobs[0]!.isListed = false;
      return new Response(JSON.stringify(payload));
    },
    sleep: async () => {},
    random: () => 0,
    now: Date.now,
  };
  sync = new SyncService(
    db.prisma,
    new ConnectorRegistry([
      new GreenhouseConnector(new GreenhouseHttp(deps)),
      new AshbyConnector(new PublicJobsHttp(deps)),
      new LeverConnector(new PublicJobsHttp(deps)),
    ]),
  );
});
after(async () => {
  await app?.close();
  await db?.close();
});

test('catalog and history begin genuinely empty', async () => {
  for (const route of ['companies', 'sources', 'sync-runs'])
    assert.deepEqual(await page(route), { items: [], total: 0, page: 1, pageSize: 20 });
});
test('registry synchronizes all three real adapter implementations into isolated PostgreSQL', async () => {
  company = (await db.prisma.company.create({ data: { name: 'Fixture Multi Platform' } })).id;
  for (const platform of ['GREENHOUSE', 'ASHBY', 'LEVER'] as const)
    sources[platform] = (
      await db.prisma.jobSource.create({
        data: { companyId: company, boardKey: 'fixture', platform },
      })
    ).id;
  sources.disabled = (
    await db.prisma.jobSource.create({
      data: {
        companyId: company,
        boardKey: 'fixture-disabled',
        platform: 'LEVER',
        region: 'EU',
        enabled: false,
      },
    })
  ).id;
  const results = await sync.synchronizeAll();
  assert.equal(results.length, 3);
  assert(results.every((r) => r.status === 'SUCCESS'));
  assert.equal(await db.prisma.job.count(), 3);
  assert.equal(await db.prisma.syncRun.count({ where: { jobSourceId: sources.disabled } }), 0);
});
test('repeated multi-platform synchronization preserves identities and firstSeenAt', async () => {
  const before = await db.prisma.job.findMany({ orderBy: { id: 'asc' } });
  const runs = await sync.synchronizeAll();
  assert(runs.every((r) => r.status === 'SUCCESS'));
  assert(runs.every((r) => 'createdCount' in r && r.createdCount === 0 && r.updatedCount === 1));
  const after = await db.prisma.job.findMany({ orderBy: { id: 'asc' } });
  assert.deepEqual(
    after.map((r) => [r.id, r.firstSeenAt]),
    before.map((r) => [r.id, r.firstSeenAt]),
  );
});
test('explicit Ashby unlisting hides existing search entry without deleting or closing it', async () => {
  const before = await db.prisma.job.findFirstOrThrow({ where: { jobSourceId: sources.ASHBY } });
  unlisted = true;
  assert.equal((await sync.synchronize(sources.ASHBY!)).status, 'SUCCESS');
  const after = await db.prisma.job.findUniqueOrThrow({ where: { id: before.id } });
  assert.equal(after.isListed, false);
  assert.equal(after.status, 'ACTIVE');
  assert.deepEqual(after.firstSeenAt, before.firstSeenAt);
  assert.equal((await page('jobs?platform=ASHBY')).total, 0);
  assert.equal((await get(`jobs/${before.id}`)).isListed, false);
  unlisted = false;
  await sync.synchronize(sources.ASHBY!);
  assert.equal((await page('jobs?platform=ASHBY')).total, 1);
});
test('one failed provider does not suppress the others or erase previously persisted jobs', async () => {
  failLever = true;
  const before = await db.prisma.job.findMany({ where: { jobSourceId: sources.LEVER } });
  const results = await sync.synchronizeAll();
  assert.equal(results.filter((r) => r.status === 'SUCCESS').length, 2);
  assert.equal(
    results.filter((r) => 'errorCode' in r && r.errorCode === 'BOARD_UNAVAILABLE').length,
    1,
  );
  assert.deepEqual(await db.prisma.job.findMany({ where: { jobSourceId: sources.LEVER } }), before);
  failLever = false;
});
test('details expose safe selected fields; UUID errors and missing records are standardized', async () => {
  const job = await db.prisma.job.findFirstOrThrow({ where: { jobSourceId: sources.ASHBY } });
  const detail = await get(`jobs/${job.id}`);
  assert.equal(detail.description, 'Aprenda com segurança.');
  assert.equal(detail.publishedAt, '2026-10-01T12:30:00.000Z');
  assert.deepEqual(detail.company, { id: company, name: 'Fixture Multi Platform' });
  assert.equal('externalId' in detail, false);
  assert.equal('jobSourceId' in detail, false);
  assert.equal((await get('jobs/no-uuid', 400)).code, 'INVALID_REQUEST');
  assert.equal((await get(`jobs/${randomUUID()}`, 404)).code, 'NOT_FOUND');
  await db.prisma.job.update({
    where: { id: job.id },
    data: {
      description: null,
      publishedAt: null,
      workplaceType: 'UNKNOWN',
      jobUrl: 'https://localhost/private',
    },
  });
  const missing = await get(`jobs/${job.id}`);
  for (const field of ['description', 'publishedAt', 'jobUrl']) assert.equal(missing[field], null);
  assert.equal(missing.workplaceType, 'UNKNOWN');
});
test('companies support search and multiple sources; sources expose disabled and never synchronized', async () => {
  const companies = await page('companies?q=multi');
  assert.equal(companies.total, 1);
  assert.equal(companies.items[0]?.sourceCount, 4);
  assert.equal(companies.items[0]?.websiteUrl, null);
  assert.equal((await page('companies?q=absent')).total, 0);
  const disabled = await page('sources?enabled=false&platform=LEVER');
  assert.equal(disabled.total, 1);
  assert.equal(disabled.items[0]?.latestRun, null);
  assert.equal(disabled.items[0]?.lastSuccessfulAt, null);
  assert.equal(disabled.items[0]?.region, 'EU');
  assert.equal((await page(`sources?companyId=${company}&enabled=true`)).total, 3);
  assert.equal((await page(`sources?companyId=${randomUUID()}`)).total, 0);
});
test('sources distinguish failed latest attempt from preceding successful completion', async () => {
  const data = await page('sources?enabled=true&platform=LEVER');
  const source = data.items[0];
  assert(source);
  const latest = source.latestRun as { status: string; errorCode: string };
  assert.equal(latest.status, 'FAILED');
  assert.equal(latest.errorCode, 'BOARD_UNAVAILABLE');
  assert.equal(typeof source.lastSuccessfulAt, 'string');
  const good = (await page('sources?platform=GREENHOUSE')).items[0]?.latestRun as {
    status: string;
  };
  assert.equal(good.status, 'SUCCESS');
});
test('historical RUNNING remains incomplete; sensitive historical messages/codes are not exposed', async () => {
  const row = await db.prisma.syncRun.create({
    data: {
      jobSourceId: sources.disabled!,
      startedAt: new Date('2020-01-01T00:00:00Z'),
      errorCode: 'secret-token',
      errorMessage: 'private credentials payload',
    },
  });
  const data = await page(`sync-runs?sourceId=${sources.disabled}&status=RUNNING`);
  assert.equal(data.total, 1);
  const run = data.items[0];
  assert(run);
  assert.equal(run.id, row.id);
  assert.equal(run.status, 'RUNNING');
  assert.equal(run.finishedAt, null);
  assert.equal(run.durationMs, null);
  assert.equal(run.errorCode, 'UNKNOWN_ERROR');
  assert(!JSON.stringify(data).includes('secret'));
  assert(!JSON.stringify(data).includes('credentials'));
});
test('history filters, deterministic sorting, pagination and durations match PostgreSQL', async () => {
  const all = await page('sync-runs?pageSize=100');
  const a = await page('sync-runs?pageSize=2');
  const b = await page('sync-runs?pageSize=2&page=2');
  assert.deepEqual(
    [...a.items, ...b.items].map((r) => r.id),
    all.items.slice(0, 4).map((r) => r.id),
  );
  const rows = await db.prisma.syncRun.findMany({
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
  });
  assert.deepEqual(
    all.items.map((r) => r.id),
    rows.map((r) => r.id),
  );
  for (const run of all.items)
    if (run.status !== 'RUNNING')
      assert.equal(
        run.durationMs,
        Date.parse(String(run.finishedAt)) - Date.parse(String(run.startedAt)),
      );
  assert.equal((await page('sync-runs?status=FAILED&platform=LEVER')).total, 1);
  assert.equal((await page(`sync-runs?sourceId=${randomUUID()}`)).total, 0);
  const s1 = await page('sources?pageSize=2');
  const s2 = await page('sources?pageSize=2&page=2');
  assert.equal(new Set([...s1.items, ...s2.items].map((r) => r.id)).size, 4);
});
test('invalid catalog queries return useful 400; all endpoints remain read-only', async () => {
  for (const query of [
    'companies?page=0',
    'companies?q=' + 'a'.repeat(201),
    'sources?enabled=yes',
    'sources?companyId=x',
    'sources?platform=OTHER',
    'sync-runs?status=UNKNOWN',
    'sync-runs?sourceId=x',
    'sync-runs?pageSize=101',
    'sync-runs?page=1&page=2',
  ]) {
    const body = await get(query, 400);
    assert.equal(body.code, 'INVALID_QUERY');
    assert.equal(typeof body.message, 'string');
  }
  for (const route of ['companies', 'sources', 'sync-runs'])
    assert.equal((await fetch(`${base}/${route}`, { method: 'POST' })).status, 404);
});
