import { Inject, Injectable } from '@nestjs/common';
import { ConnectorRegistry } from '../connectors/connector-registry';
import { IntegrationError } from '../connectors/integration-error';
import { PrismaService } from '../database/prisma.service';
import type { PrismaClient } from '../generated/prisma/client';
import { validateCollection } from './validate-collection';

export class SyncError extends Error {
  constructor(readonly code: 'SOURCE_NOT_FOUND' | 'PERSISTENCE_ERROR' | 'FINALIZATION_FAILED') {
    super(`Sincronização não concluída: ${code}.`);
  }
}

@Injectable()
export class SyncService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaClient,
    @Inject(ConnectorRegistry) private readonly connectors: ConnectorRegistry,
  ) {}

  async synchronize(sourceId: string) {
    const source = await this.prisma.jobSource.findUnique({ where: { id: sourceId } });
    if (!source) throw new SyncError('SOURCE_NOT_FOUND');
    if (!source.enabled) return { sourceId, status: 'SKIPPED' as const, reason: 'SOURCE_DISABLED' };
    // This durable record precedes HTTP. Abrupt interruption leaves RUNNING, never SUCCESS.
    const run = await this.prisma.syncRun.create({ data: { jobSourceId: source.id } });
    let phase = 'COLLECTION';
    let collection: ReturnType<typeof validateCollection> | undefined;
    try {
      const connector = this.connectors.get(source.platform);
      if (!connector) {
        phase = 'UNSUPPORTED_PLATFORM';
        throw new Error('Unsupported platform');
      }
      const result = await connector.fetchJobs(source);
      phase = 'INVALID_COLLECTION';
      collection = validateCollection(result);
      const observedAt = new Date();
      phase = 'PERSISTENCE_ERROR';
      const { jobs, receivedCount, rejected } = collection;
      const completed = await this.prisma.$transaction(
        async (tx) => {
          // Serialize writes for this source across processes. No network inside the transaction.
          await tx.$queryRaw`SELECT "id" FROM "JobSource" WHERE "id" = ${sourceId}::uuid FOR UPDATE`;
          const previous = await tx.job.findMany({
            where: { jobSourceId: sourceId, externalId: { in: jobs.map((job) => job.externalId) } },
            select: { externalId: true, lastSeenAt: true },
          });
          const existing = new Map(previous.map((job) => [job.externalId, job.lastSeenAt]));
          let createdCount = 0;
          let updatedCount = 0;
          let skippedCount = rejected.length;
          for (const job of jobs) {
            const lastSeen = existing.get(job.externalId);
            // A delayed older collection must not move timestamps/content backwards.
            if (lastSeen && lastSeen > observedAt) {
              skippedCount++;
              continue;
            }
            await tx.job.upsert({
              where: {
                jobSourceId_externalId: { jobSourceId: sourceId, externalId: job.externalId },
              },
              create: {
                ...job,
                jobSourceId: sourceId,
                firstSeenAt: observedAt,
                lastSeenAt: observedAt,
              },
              update: { ...job, lastSeenAt: observedAt },
            });
            if (lastSeen) updatedCount++;
            else createdCount++;
          }
          return tx.syncRun.update({
            where: { id: run.id },
            data: {
              status: 'SUCCESS',
              finishedAt: new Date(),
              fetchedCount: receivedCount,
              createdCount,
              updatedCount,
              skippedCount,
            },
          });
        },
        { timeout: 30000, maxWait: 5000 },
      );
      return {
        ...completed,
        durationMs: Date.now() - run.startedAt.getTime(),
        acceptedCount: jobs.length,
        rejectedCount: rejected.length,
        rejected,
        warnings: collection.warnings,
        attempts: collection.attempts,
      };
    } catch (error) {
      const code =
        error instanceof IntegrationError
          ? error.code
          : phase === 'COLLECTION'
            ? 'COLLECTION_ERROR'
            : phase;
      try {
        const failed = await this.prisma.syncRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            finishedAt: new Date(),
            fetchedCount: collection?.receivedCount ?? 0,
            skippedCount: collection?.rejected.length ?? 0,
            errorCode: code,
            errorMessage: `Sincronização falhou: ${code}.`,
          },
        });
        return {
          ...failed,
          durationMs: Date.now() - run.startedAt.getTime(),
          rejected: collection?.rejected ?? [],
          warnings: collection?.warnings ?? [],
          integration: error instanceof IntegrationError ? error.toJSON() : undefined,
        };
      } catch {
        // Database may be unavailable: preserve RUNNING for inspection and fail the CLI.
        throw new SyncError('FINALIZATION_FAILED');
      }
    }
  }

  async synchronizeAll(concurrency: 1 | 2 = 2) {
    const sources = await this.prisma.jobSource.findMany({
      where: { enabled: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const results: Awaited<ReturnType<SyncService['synchronize']>>[] = [];
    let cursor = 0;
    const workers = await Promise.allSettled(
      Array.from({ length: concurrency }, async () => {
        while (cursor < sources.length) {
          const source = sources[cursor++];
          if (source) results.push(await this.synchronize(source.id));
        }
      }),
    );
    // Wait for already-started workers before the CLI closes database connections.
    if (workers.some((worker) => worker.status === 'rejected'))
      throw new SyncError('FINALIZATION_FAILED');
    return results;
  }
}
