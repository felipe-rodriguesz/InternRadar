import 'reflect-metadata';
import process from 'node:process';
import console from 'node:console';
import { spawn } from 'node:child_process';
import { isolatedDatabase } from './helpers/isolated-database';
import { workspaceRoot } from '../src/config/environment';
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
    const sync = new SyncService(db.prisma, {
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
    });
    const run = await sync.synchronize(source.id);
    if (run.status !== 'SUCCESS') throw new Error('BROWSER_FIXTURE_FAILED');
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
