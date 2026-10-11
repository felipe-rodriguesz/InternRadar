import type { CollectionResult, JobConnector, JobSourceConfig, WorkplaceType } from '../contracts';
import { IntegrationError } from '../integration-error';
import { plainLabel, validJobUrl, validateSource } from '../normalization';
import { collection, finishCollection, optionalText, record } from '../adapter-normalization';
import { PublicJobsHttp } from '../public-jobs-http';

export const LEVER_POLICY = { pageSize: 100, maxPages: 100 } as const;
export function leverUrl(source: JobSourceConfig, skip: number): URL {
  const config = validateSource(source);
  if (config.platform !== 'LEVER' || !Number.isSafeInteger(skip) || skip < 0 || skip >= 10000)
    throw new IntegrationError('INVALID_SOURCE');
  const host = config.region === 'EU' ? 'api.eu.lever.co' : 'api.lever.co';
  return new URL(
    `https://${host}/v0/postings/${config.boardKey}?mode=json&skip=${skip}&limit=${LEVER_POLICY.pageSize}`,
  );
}

export function normalizeLeverPage(
  payload: unknown,
  result: CollectionResult,
  seen: Set<string>,
): number {
  if (!Array.isArray(payload) || payload.length > LEVER_POLICY.pageSize)
    throw new IntegrationError('UNEXPECTED_RESPONSE');
  const offset = result.receivedCount;
  result.receivedCount += payload.length;
  for (const [localIndex, item] of payload.entries()) {
    const index = offset + localIndex;
    const row = record(item);
    let externalId: string | null = null;
    const reject = (code: CollectionResult['rejected'][number]['code']) =>
      result.rejected.push({ index, externalId, code });
    if (!row) {
      reject('INVALID_ITEM');
      continue;
    }
    if (typeof row.id !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(row.id)) {
      reject('INVALID_ID');
      continue;
    }
    externalId = row.id;
    const title =
      typeof row.text === 'string' && row.text.length <= 1000 ? plainLabel(row.text) : null;
    if (!title) {
      reject('EMPTY_TITLE');
      continue;
    }
    const jobUrl = typeof row.hostedUrl === 'string' ? validJobUrl(row.hostedUrl) : null;
    if (!jobUrl) {
      reject('INVALID_JOB_URL');
      continue;
    }
    if (seen.has(externalId)) {
      reject('DUPLICATE_EXTERNAL_ID');
      continue;
    }
    seen.add(externalId);
    const text = (value: unknown, max: number, multiline = false) =>
      optionalText(value, max, index, result.warnings, multiline);
    const categories = record(row.categories);
    const parts = [text(row.descriptionPlain, 200000, true) ?? text(row.description, 200000, true)];
    if (Array.isArray(row.lists)) {
      for (const section of row.lists.slice(0, 100)) {
        const entry = record(section);
        if (entry) parts.push(text(entry.text, 1000), text(entry.content, 200000, true));
      }
    }
    parts.push(text(row.additionalPlain, 200000, true) ?? text(row.additional, 200000, true));
    const description = parts.filter(Boolean).join('\n\n') || null;
    if (description && description.length > 200000)
      result.warnings.push({ index, code: 'INVALID_OPTIONAL_FIELD' });
    const mapping: Record<string, WorkplaceType> = {
      remote: 'REMOTE',
      hybrid: 'HYBRID',
      'on-site': 'ONSITE',
    };
    result.jobs.push({
      externalId,
      title,
      jobUrl,
      description: description && description.length <= 200000 ? description : null,
      location: text(categories?.location, 2000),
      employmentType: text(categories?.commitment, 200),
      workplaceType:
        typeof row.workplaceType === 'string'
          ? (mapping[row.workplaceType] ?? 'UNKNOWN')
          : 'UNKNOWN',
      // Public documentation does not equate createdAt with publication.
      publishedAt: null,
    });
  }
  return payload.length;
}

export class LeverConnector implements JobConnector {
  readonly platform = 'LEVER' as const;
  constructor(private readonly http = new PublicJobsHttp()) {}
  async fetchJobs(source: JobSourceConfig) {
    const result = collection();
    const seen = new Set<string>();
    for (let page = 0; page < LEVER_POLICY.maxPages; page++) {
      const { payload, attempts } = await this.http.get(
        leverUrl(source, page * LEVER_POLICY.pageSize),
      );
      result.attempts += attempts;
      const length = normalizeLeverPage(payload, result, seen);
      if (length < LEVER_POLICY.pageSize) return finishCollection(result);
    }
    // Never return a truncated collection as a successful complete synchronization.
    throw new IntegrationError('PAGINATION_LIMIT');
  }
}
