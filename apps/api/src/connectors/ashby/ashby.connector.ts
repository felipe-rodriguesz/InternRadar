import { createHash } from 'node:crypto';
import type { CollectionResult, JobConnector, JobSourceConfig, WorkplaceType } from '../contracts';
import { IntegrationError } from '../integration-error';
import { optionalDate, plainLabel, validJobUrl, validateSource } from '../normalization';
import { collection, finishCollection, optionalText, record } from '../adapter-normalization';
import { PublicJobsHttp } from '../public-jobs-http';

/** Only official, path-addressed postings: query parameters never select a different job here. */
export function canonicalAshbyUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const safe = validJobUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (url.protocol !== 'https:' || url.hostname !== 'jobs.ashbyhq.com') return null;
  // Preserve path case and segment boundaries. Never collapse distinct publication IDs.
  if (!/^\/[a-zA-Z0-9_-]{1,128}\/[a-zA-Z0-9_-]{1,128}\/?$/.test(url.pathname)) return null;
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function normalizeAshby(payload: unknown, attempts: number): CollectionResult {
  const envelope = record(payload);
  if (!envelope || !Array.isArray(envelope.jobs) || envelope.jobs.length > 10000)
    throw new IntegrationError('UNEXPECTED_RESPONSE');
  const result = collection(attempts);
  result.receivedCount = envelope.jobs.length;
  const seen = new Set<string>();
  for (const [index, item] of envelope.jobs.entries()) {
    const row = record(item);
    const reject = (
      code: CollectionResult['rejected'][number]['code'],
      externalId: string | null = null,
    ) => result.rejected.push({ index, externalId, code });
    if (!row) {
      reject('INVALID_ITEM');
      continue;
    }
    const jobUrl = canonicalAshbyUrl(row.jobUrl);
    if (!jobUrl) {
      reject('INVALID_JOB_URL');
      continue;
    }
    const externalId = `urlsha256:${createHash('sha256').update(jobUrl).digest('hex')}`;
    const title =
      typeof row.title === 'string' && row.title.length <= 1000 ? plainLabel(row.title) : null;
    if (!title) {
      reject('EMPTY_TITLE', externalId);
      continue;
    }
    if (row.isListed !== undefined && typeof row.isListed !== 'boolean') {
      reject('INVALID_ITEM', externalId);
      continue;
    }
    if (seen.has(externalId)) {
      // Conflicting duplicate visibility is resolved conservatively, independent of order.
      if (row.isListed === false) {
        const previous = result.jobs.find((job) => job.externalId === externalId);
        if (previous) previous.isListed = false;
      }
      reject('DUPLICATE_EXTERNAL_ID', externalId);
      continue;
    }
    seen.add(externalId);
    const mapping: Record<string, WorkplaceType> = {
      Remote: 'REMOTE',
      Hybrid: 'HYBRID',
      OnSite: 'ONSITE',
    };
    const workplaceType =
      typeof row.workplaceType === 'string'
        ? (mapping[row.workplaceType] ?? 'UNKNOWN')
        : row.isRemote === true
          ? 'REMOTE'
          : 'UNKNOWN';
    const date = optionalDate(row.publishedAt);
    if (date.invalid) result.warnings.push({ index, code: 'INVALID_DATE' });
    const text = (value: unknown, max: number, multiline = false) =>
      optionalText(value, max, index, result.warnings, multiline);
    const description =
      text(row.descriptionPlain, 200000, true) ?? text(row.descriptionHtml, 200000, true);
    result.jobs.push({
      externalId,
      title,
      jobUrl,
      description,
      location: text(row.location, 2000),
      workplaceType,
      employmentType: text(row.employmentType, 200),
      publishedAt: date.value,
      isListed: row.isListed !== false,
    });
  }
  return finishCollection(result);
}

export class AshbyConnector implements JobConnector {
  readonly platform = 'ASHBY' as const;
  constructor(private readonly http = new PublicJobsHttp()) {}
  async fetchJobs(input: JobSourceConfig) {
    const source = validateSource(input);
    if (source.platform !== this.platform || source.region !== 'GLOBAL')
      throw new IntegrationError('INVALID_SOURCE');
    const { payload, attempts } = await this.http.get(
      new URL(`https://api.ashbyhq.com/posting-api/job-board/${source.boardKey}`),
    );
    return normalizeAshby(payload, attempts);
  }
}
