export interface Health {
  status: 'ok';
  service: 'internradar-api';
  database: { status: 'connected' };
}

export class DatabaseUnavailableError extends Error {}

export async function fetchHealth(signal: AbortSignal): Promise<Health> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1';
  const response = await fetch(`${base.replace(/\/$/, '')}/health`, {
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
  });
  const body: unknown = await response.json();
  if (
    response.status === 503 &&
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    body.code === 'DATABASE_UNAVAILABLE'
  )
    throw new DatabaseUnavailableError();
  if (!response.ok) throw new Error('A API não está disponível.');
  if (
    typeof body !== 'object' ||
    body === null ||
    !('status' in body) ||
    body.status !== 'ok' ||
    !('service' in body) ||
    body.service !== 'internradar-api' ||
    !('database' in body) ||
    typeof body.database !== 'object' ||
    body.database === null ||
    !('status' in body.database) ||
    body.database.status !== 'connected'
  ) {
    throw new Error('Resposta de saúde inválida.');
  }
  return body as Health;
}
