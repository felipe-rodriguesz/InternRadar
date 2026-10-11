import type { CollectionResult, NormalizationWarning } from './contracts';
import { htmlToPlainText, plainLabel } from './normalization';

export const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export function collection(attempts = 0): CollectionResult {
  return {
    jobs: [],
    rejected: [],
    warnings: [],
    receivedCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    attempts,
  };
}

export function optionalText(
  value: unknown,
  max: number,
  index: number,
  warnings: NormalizationWarning[],
  multiline = false,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > max) {
    warnings.push({ index, code: 'INVALID_OPTIONAL_FIELD' });
    return null;
  }
  // Plain variants are still untrusted; never pass them through as executable markup.
  return multiline ? htmlToPlainText(value) : plainLabel(value);
}

export function finishCollection(result: CollectionResult): CollectionResult {
  result.acceptedCount = result.jobs.length;
  result.rejectedCount = result.rejected.length;
  return result;
}
