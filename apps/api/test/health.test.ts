import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from '../src/application';

test('HTTP real: saúde, alias, CORS e erro sanitizado', async () => {
  const app = await createApplication(false);
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const health = await fetch(`${base}/api/v1/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await health.json(), {
      status: 'ok',
      service: 'internradar-api',
      database: { status: 'not_checked' },
    });
    const alias = await fetch(`${base}/health`);
    assert.equal(alias.status, 200);
    const denied = await fetch(`${base}/api/v1/health`, {
      headers: { Origin: 'https://example.com' },
    });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const missing = await fetch(`${base}/api/v1/missing`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Recurso não encontrado.',
    });
  } finally {
    await app.close();
  }
});
