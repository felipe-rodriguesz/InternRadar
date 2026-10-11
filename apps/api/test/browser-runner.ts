import 'reflect-metadata';
import process from 'node:process';
import console from 'node:console';
import { spawn } from 'node:child_process';
import { isolatedDatabase } from './helpers/isolated-database';
import { workspaceRoot } from '../src/config/environment';
import { ConnectorRegistry } from '../src/connectors/connector-registry';
import { SyncService } from '../src/sync/sync.service';
import { browserJobs } from './fixtures/jobs/browser-data';

async function main() {
  const db = await isolatedDatabase('browser');
  async function browsers(empty: boolean) {
    const code = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(
        'pnpm',
        [
          '--filter',
          '@internradar/web',
          'exec',
          'playwright',
          'test',
          empty ? '--grep' : '--grep-invert',
          '@empty',
          ...process.argv.slice(2),
        ],
        {
          cwd: workspaceRoot(),
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: db.url, INTERNRADAR_BROWSER_ISOLATED: '1' },
        },
      );
      child.once('error', reject);
      child.once('exit', resolve);
    });
    if (code !== 0) throw new Error('BROWSER_TEST_FAILED');
  }
  try {
    await browsers(true);
    const company = await db.prisma.company.create({
      data: { name: 'Fixture Browser Company — sintética' },
    });
    const source = await db.prisma.jobSource.create({
      data: { companyId: company.id, platform: 'GREENHOUSE', boardKey: 'synthetic-browser' },
    });
    const sync = new SyncService(
      db.prisma,
      new ConnectorRegistry([
        {
          platform: 'GREENHOUSE',
          fetchJobs: () =>
            Promise.resolve({
              jobs: browserJobs,
              receivedCount: browserJobs.length,
              acceptedCount: browserJobs.length,
              rejectedCount: 0,
              rejected: [],
              warnings: [],
              attempts: 1,
            }),
        },
      ]),
    );
    const run = await sync.synchronize(source.id);
    if (run.status !== 'SUCCESS') throw new Error('BROWSER_FIXTURE_FAILED');
    // Additional provenance/detail fixtures stay exclusively in this new test schema.
    await db.prisma.job.create({
      data: {
        id: 'c6cfbda2-3804-42a9-9bc1-8f6e3d8234cc',
        jobSourceId: source.id,
        externalId: 'fixture-unlisted-detail',
        title: 'Fixture Optional Details',
        jobUrl: 'http://localhost/unsafe',
        isListed: false,
      },
    });
    await db.prisma.syncRun.create({
      data: {
        jobSourceId: source.id,
        status: 'FAILED',
        startedAt: new Date(Date.now() + 1000),
        finishedAt: new Date(Date.now() + 2000),
        errorCode: 'NETWORK_ERROR',
      },
    });
    for (let i = 0; i < 22; i++)
      await db.prisma.syncRun.create({
        data: {
          jobSourceId: source.id,
          status: 'SUCCESS',
          startedAt: new Date(Date.UTC(2026, 0, i + 1)),
          finishedAt: new Date(Date.UTC(2026, 0, i + 1, 0, 0, 2)),
          fetchedCount: 23,
          updatedCount: 23,
        },
      });
    await db.prisma.jobSource.create({
      data: { companyId: company.id, platform: 'GREENHOUSE', boardKey: 'fixture-never' },
    });
    await db.prisma.jobSource.create({
      data: {
        companyId: company.id,
        platform: 'LEVER',
        boardKey: 'fixture-disabled',
        region: 'EU',
        enabled: false,
      },
    });
    const ashbyCompany = await db.prisma.company.create({
      data: { name: 'Fixture Ashby Company' },
    });
    const ashby = await db.prisma.jobSource.create({
      data: { companyId: ashbyCompany.id, platform: 'ASHBY', boardKey: 'fixture-running' },
    });
    await db.prisma.syncRun.create({
      data: { jobSourceId: ashby.id, startedAt: new Date('2020-01-01T00:00:00Z') },
    });
    await db.prisma.job.create({
      data: {
        id: 'c6cfbda2-3804-42a9-9bc1-8f6e3d8234cd',
        jobSourceId: source.id,
        externalId: 'fixture-published-detail',
        title: 'Fixture Published Details',
        isListed: false,
        description:
          'Fixture linha 1\n\n<script>window.__fixtureXss = true</script>\nTexto literal seguro.',
        publishedAt: new Date('2026-09-02T12:00:00Z'),
        status: 'CLOSED',
        jobUrl: 'https://example.com/jobs/fixture-published-detail',
      },
    });
    await browsers(false);
  } finally {
    await db.close();
  }
}
void main().catch(() => {
  console.error(
    'Falha nos testes de navegador; confira o relatório acima. Schema e recursos preservados.',
  );
  process.exitCode = 1;
});
