import { setTimeout as sleep } from 'node:timers/promises';
import { IntegrationError } from '../integration-error';

export const HTTP_POLICY = {
  timeoutMs: 10_000,
  attempts: 3,
  baseDelayMs: 500,
  jitterMs: 250,
  maxRetryAfterMs: 30_000,
  maxBodyBytes: 8 * 1024 * 1024,
} as const;

export interface HttpDependencies {
  fetch: (url: URL, init: RequestInit) => Promise<Response>;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  now: () => number;
}

export function greenhouseJobsUrl(boardKey: string): URL {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(boardKey)) throw new IntegrationError('INVALID_SOURCE');
  return new URL(`https://boards-api.greenhouse.io/v1/boards/${boardKey}/jobs?content=true`);
}

export function retryAfterDelay(value: string | null, now: number): number | undefined {
  if (value === null) return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000;
  // Avoid Date.parse interpreting malformed numeric values as historical dates.
  if (!/^[A-Z][a-z]{2}, /u.test(value)) return undefined;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

function httpError(response: Response, now: number): IntegrationError {
  const status = response.status;
  const code =
    status === 429
      ? 'RATE_LIMITED'
      : status >= 500
        ? 'UPSTREAM_SERVER_ERROR'
        : status === 404 || status === 410
          ? 'BOARD_NOT_FOUND'
          : status === 401 || status === 403
            ? 'BOARD_UNAVAILABLE'
            : status >= 300 && status < 400
              ? 'REDIRECT_NOT_ALLOWED'
              : 'HTTP_ERROR';
  return new IntegrationError(
    code,
    status,
    retryAfterDelay(response.headers.get('retry-after'), now),
  );
}

async function readJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get('content-length'));
  if (length > HTTP_POLICY.maxBodyBytes) {
    await response.body?.cancel();
    throw new IntegrationError('RESPONSE_TOO_LARGE');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new IntegrationError('INVALID_JSON');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > HTTP_POLICY.maxBodyBytes) {
        await reader.cancel();
        throw new IntegrationError('RESPONSE_TOO_LARGE');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new IntegrationError('INVALID_JSON');
  }
}

export class GreenhouseHttp {
  constructor(
    private readonly dependencies: HttpDependencies = {
      fetch: (url, init) => fetch(url, init),
      sleep: async (ms) => {
        await sleep(ms);
      },
      random: Math.random,
      now: Date.now,
    },
  ) {}

  async listJobs(boardKey: string): Promise<{ payload: unknown; attempts: number }> {
    const url = greenhouseJobsUrl(boardKey);
    for (let attempt = 1; attempt <= HTTP_POLICY.attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HTTP_POLICY.timeoutMs);
      let failure: IntegrationError;
      try {
        const response = await this.dependencies.fetch(url, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'InternRadar/0.0.0 (public job board reader)',
          },
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw httpError(response, this.dependencies.now());
        }
        return { payload: await readJson(response), attempts: attempt };
      } catch (cause) {
        failure =
          cause instanceof IntegrationError
            ? cause
            : new IntegrationError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR');
        failure.attempts = attempt;
      } finally {
        clearTimeout(timer);
      }

      if ((failure.retryAfterMs ?? 0) > HTTP_POLICY.maxRetryAfterMs)
        failure.retryAfterExceeded = true;
      if (!failure.retryable || attempt === HTTP_POLICY.attempts) throw failure;
      const backoff =
        HTTP_POLICY.baseDelayMs * 2 ** (attempt - 1) +
        Math.floor(this.dependencies.random() * HTTP_POLICY.jitterMs);
      await this.dependencies.sleep(Math.max(backoff, failure.retryAfterMs ?? 0));
    }
    throw new IntegrationError('NETWORK_ERROR'); // Unreachable with the fixed positive attempt limit.
  }
}
