import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { validJobUrl } from '../connectors/normalization';
import type { parseCatalogQuery } from './catalog-query';

const companySelect = { id: true, name: true } as const;
const sourceSelect = {
  id: true,
  platform: true,
  boardKey: true,
  region: true,
  enabled: true,
  company: { select: companySelect },
} as const;
const runSelect = {
  id: true,
  status: true,
  startedAt: true,
  finishedAt: true,
  fetchedCount: true,
  createdCount: true,
  updatedCount: true,
  skippedCount: true,
  errorCode: true,
} as const;
const runOrder = [{ startedAt: 'desc' }, { id: 'desc' }] as const;
const errorCodes = new Set([
  'INVALID_SOURCE',
  'RATE_LIMITED',
  'UPSTREAM_SERVER_ERROR',
  'BOARD_NOT_FOUND',
  'BOARD_UNAVAILABLE',
  'HTTP_ERROR',
  'REDIRECT_NOT_ALLOWED',
  'TIMEOUT',
  'NETWORK_ERROR',
  'INVALID_JSON',
  'UNEXPECTED_RESPONSE',
  'RESPONSE_TOO_LARGE',
  'PAGINATION_LIMIT',
  'COLLECTION_ERROR',
  'INVALID_COLLECTION',
  'PERSISTENCE_ERROR',
  'UNSUPPORTED_PLATFORM',
]);
function publicRun<
  T extends { startedAt: Date; finishedAt: Date | null; status: string; errorCode: string | null },
>(run: T) {
  const finished = run.finishedAt;
  return {
    ...run,
    durationMs:
      run.status !== 'RUNNING' && finished && finished >= run.startedAt
        ? finished.getTime() - run.startedAt.getTime()
        : null,
    errorCode:
      run.errorCode === null
        ? null
        : errorCodes.has(run.errorCode)
          ? run.errorCode
          : 'UNKNOWN_ERROR',
  };
}
const window = ({ page, pageSize }: { page: number; pageSize: number }) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async companies(query: ReturnType<typeof parseCatalogQuery<'companies'>>) {
    const where = query.q
      ? { name: { contains: query.q.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' as const } }
      : {};
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.company.findMany({
          where,
          ...window(query),
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: { ...companySelect, websiteUrl: true, _count: { select: { sources: true } } },
        }),
        this.prisma.company.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items: rows.map(({ _count, websiteUrl, ...row }) => ({
        ...row,
        websiteUrl: websiteUrl ? validJobUrl(websiteUrl) : null,
        sourceCount: _count.sources,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async sources(query: ReturnType<typeof parseCatalogQuery<'sources'>>) {
    const where = {
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.jobSource.findMany({
          where,
          ...window(query),
          orderBy: [
            { company: { name: 'asc' } },
            { platform: 'asc' },
            { boardKey: 'asc' },
            { id: 'asc' },
          ],
          select: {
            ...sourceSelect,
            syncRuns: { orderBy: [...runOrder], take: 1, select: runSelect },
          },
        });
        // Two bounded relation projections: no per-source N+1, no entire history loaded.
        const successes = await tx.jobSource.findMany({
          where: { id: { in: rows.map((r) => r.id) } },
          select: {
            id: true,
            syncRuns: {
              where: { status: 'SUCCESS', finishedAt: { not: null } },
              orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
              take: 1,
              select: { finishedAt: true },
            },
          },
        });
        const lastSuccess = new Map(
          successes.map((s) => [s.id, s.syncRuns[0]?.finishedAt ?? null]),
        );
        const total = await tx.jobSource.count({ where });
        return {
          items: rows.map(({ syncRuns, ...source }) => ({
            ...source,
            latestRun: syncRuns[0] ? publicRun(syncRuns[0]) : null,
            lastSuccessfulAt: lastSuccess.get(source.id) ?? null,
          })),
          page: query.page,
          pageSize: query.pageSize,
          total,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async runs(query: ReturnType<typeof parseCatalogQuery<'runs'>>) {
    const where = {
      ...(query.sourceId ? { jobSourceId: query.sourceId } : {}),
      ...(query.platform ? { source: { platform: query.platform } } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.syncRun.findMany({
          where,
          ...window(query),
          orderBy: [...runOrder],
          select: { ...runSelect, source: { select: sourceSelect } },
        }),
        this.prisma.syncRun.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { items: rows.map(publicRun), page: query.page, pageSize: query.pageSize, total };
  }
}
