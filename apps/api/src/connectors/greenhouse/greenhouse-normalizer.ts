import { z } from 'zod';
import type { CollectionResult, NormalizedJob, RejectionCode } from '../contracts';
import { IntegrationError } from '../integration-error';
import { htmlToPlainText, plainLabel, validJobUrl } from '../normalization';

const envelope = z.object({ jobs: z.array(z.unknown()).max(10_000) });
const fields = z.object({
  id: z.unknown().optional(),
  title: z.unknown().optional(),
  absolute_url: z.unknown().optional(),
  content: z.unknown().optional(),
  location: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

export function normalizeGreenhouse(payload: unknown, attempts: number): CollectionResult {
  const parsed = envelope.safeParse(payload);
  if (!parsed.success) throw new IntegrationError('UNEXPECTED_RESPONSE');
  const result: CollectionResult = {
    jobs: [],
    rejected: [],
    warnings: [],
    receivedCount: parsed.data.jobs.length,
    acceptedCount: 0,
    rejectedCount: 0,
    attempts,
  };
  for (const [index, item] of parsed.data.jobs.entries()) {
    const candidate = fields.safeParse(item);
    let externalId: string | null = null;
    const reject = (code: RejectionCode) => result.rejected.push({ index, externalId, code });
    if (!candidate.success) {
      reject('INVALID_ITEM');
      continue;
    }
    const data = candidate.data;
    if (typeof data.id !== 'number' || !Number.isSafeInteger(data.id) || data.id <= 0) {
      reject('INVALID_ID');
      continue;
    }
    externalId = String(data.id);
    const title =
      typeof data.title === 'string' && data.title.length <= 1000 ? plainLabel(data.title) : null;
    if (!title) {
      reject('EMPTY_TITLE');
      continue;
    }
    const jobUrl = typeof data.absolute_url === 'string' ? validJobUrl(data.absolute_url) : null;
    if (!jobUrl) {
      reject('INVALID_JOB_URL');
      continue;
    }
    let description: string | null = null;
    if (data.content !== undefined && data.content !== null) {
      if (typeof data.content === 'string' && data.content.length <= 200_000)
        description = htmlToPlainText(data.content);
      else result.warnings.push({ index, code: 'INVALID_OPTIONAL_FIELD' });
    }
    let location: string | null = null;
    if (data.location !== undefined && data.location !== null) {
      const name = z.object({ name: z.string().max(2000).nullish() }).safeParse(data.location);
      if (name.success) location = name.data.name ? plainLabel(name.data.name) : null;
      else result.warnings.push({ index, code: 'INVALID_OPTIONAL_FIELD' });
    }
    // Custom fields have no universal IDs: accept only an explicitly named text field.
    const employment = z
      .array(
        z.object({
          name: z.string(),
          value_type: z.string(),
          value: z.unknown(),
        }),
      )
      .safeParse(data.metadata);
    const employmentValues = employment.success
      ? employment.data.filter(
          (field) => field.name === 'Employment Type' && field.value_type === 'text',
        )
      : [];
    const value = employmentValues.length === 1 ? employmentValues[0]?.value : null;
    const employmentType =
      typeof value === 'string' && value.length <= 200 ? plainLabel(value) : null;
    const job: NormalizedJob = {
      externalId,
      title,
      description,
      location,
      jobUrl,
      // The list API does not document a publication date or universal employment/workplace metadata.
      publishedAt: null,
      workplaceType: 'UNKNOWN',
      employmentType,
    };
    result.jobs.push(job);
  }
  result.acceptedCount = result.jobs.length;
  result.rejectedCount = result.rejected.length;
  return result;
}
