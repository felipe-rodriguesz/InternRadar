import { isJob, JobsError } from './jobs';
import type { JobItem } from './jobs';

export interface JobDetail extends JobItem {
  description: string | null;
  isListed: boolean;
}
export interface RunSummary {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCode: string | null;
}
export interface SourceItem {
  id: string;
  platform: JobItem['source']['platform'];
  boardKey: string;
  region: 'GLOBAL' | 'EU';
  enabled: boolean;
  company: JobItem['company'];
  latestRun: RunSummary | null;
  lastSuccessfulAt: string | null;
}
export interface RunItem extends RunSummary {
  source: Omit<SourceItem, 'latestRun' | 'lastSuccessfulAt'>;
}
export interface CatalogPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const nullableText = (v: unknown) => v === null || typeof v === 'string';
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
function isRun(v: unknown): v is RunSummary {
  return (
    record(v) &&
    typeof v.id === 'string' &&
    ['RUNNING', 'SUCCESS', 'FAILED'].includes(String(v.status)) &&
    date(v.startedAt) &&
    (v.finishedAt === null || date(v.finishedAt)) &&
    (v.durationMs === null || count(v.durationMs)) &&
    ['fetchedCount', 'createdCount', 'updatedCount', 'skippedCount'].every((k) => count(v[k])) &&
    nullableText(v.errorCode)
  );
}
function isSource(v: unknown): boolean {
  return (
    record(v) &&
    typeof v.id === 'string' &&
    typeof v.boardKey === 'string' &&
    ['GREENHOUSE', 'ASHBY', 'LEVER'].includes(String(v.platform)) &&
    ['GLOBAL', 'EU'].includes(String(v.region)) &&
    typeof v.enabled === 'boolean' &&
    record(v.company) &&
    typeof v.company.id === 'string' &&
    typeof v.company.name === 'string'
  );
}
async function request(path: string, signal: AbortSignal): Promise<unknown> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1';
  let response: Response;
  try {
    response = await fetch(`${base}/${path}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      cache: 'no-store',
    });
  } catch {
    throw new JobsError('connection');
  }
  if (!response.ok)
    throw new JobsError(
      response.status === 404 ? 'notfound' : response.status === 400 ? 'query' : 'backend',
    );
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new JobsError('contract');
  }
}
export async function fetchDetail(id: string, signal: AbortSignal): Promise<JobDetail> {
  const data = await request(`jobs/${encodeURIComponent(id)}`, signal);
  if (
    !isJob(data) ||
    !record(data) ||
    !nullableText(data.description) ||
    typeof data.isListed !== 'boolean'
  )
    throw new JobsError('contract');
  return data as unknown as JobDetail;
}
async function page<T>(
  path: string,
  signal: AbortSignal,
  guard: (v: unknown) => boolean,
): Promise<CatalogPage<T>> {
  const data = await request(path, signal);
  if (
    !record(data) ||
    !Array.isArray(data.items) ||
    !data.items.every(guard) ||
    !count(data.page) ||
    Number(data.page) < 1 ||
    !count(data.pageSize) ||
    Number(data.pageSize) < 1 ||
    Number(data.pageSize) > 100 ||
    !count(data.total) ||
    data.items.length > Number(data.pageSize) ||
    data.items.length > Number(data.total)
  )
    throw new JobsError('contract');
  return data as unknown as CatalogPage<T>;
}
export const fetchSources = (query: string, signal: AbortSignal) =>
  page<SourceItem>(
    `sources?${query}`,
    signal,
    (v) =>
      isSource(v) &&
      record(v) &&
      (v.latestRun === null || isRun(v.latestRun)) &&
      (v.lastSuccessfulAt === null || date(v.lastSuccessfulAt)),
  );
export const fetchRuns = (query: string, signal: AbortSignal) =>
  page<RunItem>(`sync-runs?${query}`, signal, (v) => isRun(v) && record(v) && isSource(v.source));
