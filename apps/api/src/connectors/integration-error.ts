export type IntegrationErrorCode =
  | 'INVALID_SOURCE'
  | 'RATE_LIMITED'
  | 'UPSTREAM_SERVER_ERROR'
  | 'BOARD_NOT_FOUND'
  | 'BOARD_UNAVAILABLE'
  | 'HTTP_ERROR'
  | 'REDIRECT_NOT_ALLOWED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'INVALID_JSON'
  | 'UNEXPECTED_RESPONSE'
  | 'RESPONSE_TOO_LARGE'
  | 'PAGINATION_LIMIT';

const transient: IntegrationErrorCode[] = [
  'RATE_LIMITED',
  'UPSTREAM_SERVER_ERROR',
  'TIMEOUT',
  'NETWORK_ERROR',
];

/** Never attaches payloads, raw URLs, response bodies or transport error messages. */
export class IntegrationError extends Error {
  attempts = 1;
  retryAfterExceeded = false;

  constructor(
    readonly code: IntegrationErrorCode,
    readonly httpStatus?: number,
    readonly retryAfterMs?: number,
  ) {
    super(`Falha de integração: ${code}.`);
    this.name = 'IntegrationError';
  }

  get retryable(): boolean {
    return transient.includes(this.code) && !this.retryAfterExceeded;
  }

  toJSON() {
    return {
      code: this.code,
      attempts: this.attempts,
      httpStatus: this.httpStatus,
      retryAfterMs: this.retryAfterMs,
      retryAfterExceeded: this.retryAfterExceeded,
    };
  }
}
