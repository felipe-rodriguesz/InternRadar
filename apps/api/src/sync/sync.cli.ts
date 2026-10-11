import 'reflect-metadata';
import process from 'node:process';
import console from 'node:console';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { z } from 'zod';
import { SyncModule } from './sync.module';
import { SyncError, SyncService } from './sync.service';
import { PrismaService } from '../database/prisma.service';

async function main() {
  const { values } = parseArgs({
    options: {
      source: { type: 'string' },
      concurrency: { type: 'string' },
      list: { type: 'boolean' },
    },
    strict: true,
    allowPositionals: false,
  });
  const args = z
    .object({
      source: z.uuid().optional(),
      concurrency: z.enum(['1', '2']).default('2'),
      list: z.boolean().optional(),
    })
    .parse(values);
  const app = await NestFactory.createApplicationContext(SyncModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    if (args.list) {
      console.log(
        JSON.stringify(
          await app.get(PrismaService).jobSource.findMany({
            select: {
              id: true,
              platform: true,
              boardKey: true,
              enabled: true,
              company: { select: { name: true } },
            },
          }),
          null,
          2,
        ),
      );
      return;
    }
    const sync = app.get(SyncService);
    const results = args.source
      ? [await sync.synchronize(args.source)]
      : await sync.synchronizeAll(args.concurrency === '1' ? 1 : 2);
    for (const result of results) console.log(JSON.stringify(result));
    if (results.some((result) => result.status === 'FAILED')) process.exitCode = 1;
  } finally {
    await app.close();
  }
}
void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'FAILED',
      code: error instanceof SyncError ? error.code : 'SYNC_COMMAND_FAILED',
      message:
        'Confira argumentos (--source UUID, --concurrency 1|2, --list), ambiente e banco. Execuções RUNNING podem estar incompletas.',
    }),
  );
  process.exitCode = 1;
});
