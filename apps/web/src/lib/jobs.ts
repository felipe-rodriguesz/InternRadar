export interface JobItem {
  id: string;
  title: string;
  company: { id: string; name: string };
  source: { id: string; platform: 'GREENHOUSE' | 'ASHBY' | 'LEVER' };
  location: string | null;
  workplaceType: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';
  employmentType: string | null;
  jobUrl: string | null;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: 'ACTIVE' | 'POSSIBLY_CLOSED' | 'CLOSED';
}
export interface JobsPage {
  items: JobItem[];
  page: number;
  pageSize: number;
  total: number;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const nullableText = (value: unknown) => value === null || typeof value === 'string';
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
function isJob(value: unknown): value is JobItem {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    record(value.company) &&
    typeof value.company.id === 'string' &&
    typeof value.company.name === 'string' &&
    record(value.source) &&
    typeof value.source.id === 'string' &&
    ['GREENHOUSE', 'ASHBY', 'LEVER'].includes(String(value.source.platform)) &&
    ['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'].includes(String(value.workplaceType)) &&
    ['ACTIVE', 'POSSIBLY_CLOSED', 'CLOSED'].includes(String(value.status)) &&
    nullableText(value.location) &&
    nullableText(value.employmentType) &&
    nullableText(value.jobUrl) &&
    (value.publishedAt === null || date(value.publishedAt)) &&
    date(value.firstSeenAt) &&
    date(value.lastSeenAt)
  );
}
export function safeExternalUrl(value: string | null): string | null {
  if (!value || value.length > 4096 || /[\s\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.includes('.') ||
      /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname) ||
      /^[\d.]+$/.test(url.hostname) ||
      url.hostname.includes(':')
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export class JobsError extends Error {
  constructor(readonly kind: 'connection' | 'backend' | 'query' | 'contract') {
    super(kind);
  }
}
export async function fetchJobs(query: string, signal: AbortSignal): Promise<JobsPage> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1';
  let response: Response;
  try {
    response = await fetch(`${base}/jobs?${query}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      cache: 'no-store',
    });
  } catch {
    throw new JobsError('connection');
  }
  if (!response.ok) throw new JobsError(response.status === 400 ? 'query' : 'backend');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new JobsError('contract');
  }
  if (
    !record(body) ||
    !Array.isArray(body.items) ||
    !body.items.every(isJob) ||
    !Number.isInteger(body.page) ||
    Number(body.page) < 1 ||
    !Number.isInteger(body.pageSize) ||
    Number(body.pageSize) < 1 ||
    Number(body.pageSize) > 100 ||
    !Number.isInteger(body.total) ||
    Number(body.total) < 0 ||
    body.items.length > Number(body.pageSize) ||
    body.items.length > Number(body.total)
  )
    throw new JobsError('contract');
  return body as unknown as JobsPage;
}
