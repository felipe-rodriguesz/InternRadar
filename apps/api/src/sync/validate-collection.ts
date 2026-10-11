import { z } from 'zod';
import type { CollectionResult, NormalizedJob } from '../connectors/contracts';
import { validJobUrl } from '../connectors/normalization';

const jobSchema = z.object({
  externalId: z.string().trim().min(1).max(256),
  title: z.string().trim().min(1).max(1000),
  description: z.string().max(200000).nullable(),
  location: z.string().max(2000).nullable(),
  workplaceType: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN']),
  employmentType: z.string().max(200).nullable(),
  jobUrl: z.string().refine((value) => validJobUrl(value) !== null),
  publishedAt: z.date().nullable(),
  isListed: z.boolean().default(true),
});
const count = z.number().int().min(0).max(10000);
const envelope = z.object({
  jobs: z.array(z.unknown()).max(10000),
  rejected: z
    .array(
      z.object({
        index: count,
        code: z.enum([
          'INVALID_ITEM',
          'INVALID_ID',
          'EMPTY_TITLE',
          'INVALID_JOB_URL',
          'DUPLICATE_EXTERNAL_ID',
        ]),
      }),
    )
    .max(10000),
  warnings: z
    .array(z.object({ index: count, code: z.enum(['INVALID_DATE', 'INVALID_OPTIONAL_FIELD']) }))
    .max(20000),
  receivedCount: count,
  acceptedCount: count,
  rejectedCount: count,
  attempts: z.number().int().min(1).max(300),
});

/** Checks the normalized boundary; never interprets a platform payload here. */
export function validateCollection(result: CollectionResult) {
  const parsed = envelope.safeParse(result);
  if (!parsed.success) throw new Error('INVALID_COLLECTION');
  const value = parsed.data;
  if (
    value.acceptedCount !== value.jobs.length ||
    value.rejectedCount !== value.rejected.length ||
    value.receivedCount !== value.acceptedCount + value.rejectedCount
  ) {
    throw new Error('INVALID_COLLECTION');
  }
  const jobs: NormalizedJob[] = [];
  const seen = new Set<string>();
  const rejected = value.rejected.map(({ index, code }) => ({ index, code: String(code) }));
  value.jobs.forEach((item, index) => {
    const job = jobSchema.safeParse(item);
    if (!job.success) rejected.push({ index, code: 'INVALID_NORMALIZED_JOB' });
    else if (seen.has(job.data.externalId)) rejected.push({ index, code: 'DUPLICATE_EXTERNAL_ID' });
    else {
      seen.add(job.data.externalId);
      jobs.push(job.data);
    }
  });
  return {
    jobs,
    rejected,
    warnings: value.warnings,
    receivedCount: value.receivedCount,
    attempts: value.attempts,
  };
}
