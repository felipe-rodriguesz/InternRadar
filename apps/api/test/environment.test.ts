import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEnvironment } from '../src/config/environment';

test('ambiente aceita portas e origens locais explícitas', () => {
  const env = validateEnvironment({ API_PORT: '3101', CORS_ORIGINS: 'http://localhost:3100' });
  assert.equal(env.API_PORT, 3101);
  assert.deepEqual(env.CORS_ORIGINS, ['http://localhost:3100']);
});

test('rejeita exposição de host, portas inválidas e origens remotas/ambíguas', () => {
  for (const input of [
    { API_HOST: '0.0.0.0' },
    { API_PORT: '65536' },
    { API_PORT: 'abc' },
    { CORS_ORIGINS: 'https://example.com' },
    { CORS_ORIGINS: 'http://localhost:3000/path' },
    { CORS_ORIGINS: '*' },
  ]) {
    assert.throws(() => validateEnvironment(input), /Configuração inválida/);
  }
});
