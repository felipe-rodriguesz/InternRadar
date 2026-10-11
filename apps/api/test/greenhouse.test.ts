import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { test } from 'node:test';
import type { JobSourceConfig } from '../src/connectors/contracts';
import { IntegrationError } from '../src/connectors/integration-error';
import { GreenhouseConnector } from '../src/connectors/greenhouse/greenhouse.connector';
import {
  GreenhouseHttp,
  greenhouseJobsUrl,
  HTTP_POLICY,
  retryAfterDelay,
} from '../src/connectors/greenhouse/greenhouse-http';
import type { HttpDependencies } from '../src/connectors/greenhouse/greenhouse-http';

const source: JobSourceConfig = {
  id: 'ce96e6c0-48b0-42e3-b2c7-285a10fd4822',
  platform: 'GREENHOUSE',
  boardKey: 'fixture',
  region: 'GLOBAL',
};
const raw = (name: string) => readFileSync(join(__dirname, 'fixtures/greenhouse', name), 'utf8');
const fixture = (name: string): unknown => JSON.parse(raw(`${name}.json`)) as unknown;
const fromFixture = (name: string) =>
  new Response(raw(`${name}.json`), { headers: { 'Content-Type': 'application/json' } });

function transport(fetcher: HttpDependencies['fetch']) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const waits: number[] = [];
  const http = new GreenhouseHttp({
    fetch: async (url, init) => {
      calls.push({ url, init });
      return fetcher(url, init);
    },
    sleep: async (ms) => {
      waits.push(ms);
    },
    random: () => 0.5,
    now: () => Date.parse('2026-10-11T00:00:00Z'),
  });
  return { connector: new GreenhouseConnector(http), calls, waits };
}

test('coleta usa host/rota/query fixos, GET público, sem redirects; campos corretos', async () => {
  const t = transport(async () => fromFixture('valid'));
  const result = await t.connector.fetchJobs(source);
  assert.equal(
    t.calls[0]?.url.href,
    'https://boards-api.greenhouse.io/v1/boards/fixture/jobs?content=true',
  );
  assert.equal(t.calls[0]?.init.method, 'GET');
  assert.equal(t.calls[0]?.init.redirect, 'manual');
  assert.deepEqual(result.jobs[0], {
    externalId: '101',
    title: 'Fixture — Estágio em Software',
    description: 'Construa & aprenda.\n\nTypeScript',
    location: 'Curitiba, Brasil; São Paulo, Brasil',
    jobUrl: 'https://boards.greenhouse.io/fixture/jobs/101',
    publishedAt: null,
    workplaceType: 'UNKNOWN',
    employmentType: 'Intern',
  });
  assert.equal(result.receivedCount, 1);
  assert.equal(result.acceptedCount, 1);
  assert.equal(result.rejectedCount, 0);
  assert.equal(result.attempts, 1);
  assert.deepEqual(t.waits, []);
});

test('fonte inválida é recusada antes da rede, incluindo plataforma/região incompatíveis', async () => {
  const t = transport(async () => {
    throw new Error('must not fetch');
  });
  for (const input of [
    { ...source, boardKey: '../figma' },
    { ...source, region: 'EU' as const },
    { ...source, platform: 'LEVER' as const },
  ]) {
    await assert.rejects(t.connector.fetchJobs(input), { code: 'INVALID_SOURCE' });
  }
  assert.equal(t.calls.length, 0);
  assert.throws(() => greenhouseJobsUrl('https://example.com'), { code: 'INVALID_SOURCE' });
});

test('opcionais ausentes permanecem null; Remote no título não comprova modalidade', async () => {
  const { jobs } = await transport(async () => fromFixture('optional-missing')).connector.fetchJobs(
    source,
  );
  assert(jobs[0]);
  for (const key of ['description', 'location', 'publishedAt', 'employmentType'] as const)
    assert.equal(jobs[0][key], null);
  assert.equal(jobs[0].workplaceType, 'UNKNOWN');
});

test('lista vazia válida não equivale a falha', async () => {
  const result = await transport(async () => fromFixture('empty')).connector.fetchJobs(source);
  assert.deepEqual(result, {
    jobs: [],
    rejected: [],
    warnings: [],
    receivedCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    attempts: 1,
  });
});

test('mistura preserva válidos, contabiliza motivos por índice e avisa opcionais inválidos', async () => {
  const result = await transport(async () => fromFixture('mixed-invalid')).connector.fetchJobs(
    source,
  );
  assert.equal(result.receivedCount, 7);
  assert.equal(result.acceptedCount, 2);
  assert.equal(result.rejectedCount, 5);
  assert.deepEqual(
    result.rejected.map(({ index, code }) => ({ index, code })),
    [
      { index: 1, code: 'INVALID_ITEM' },
      { index: 2, code: 'INVALID_ID' },
      { index: 3, code: 'INVALID_ID' },
      { index: 4, code: 'EMPTY_TITLE' },
      { index: 5, code: 'INVALID_JOB_URL' },
    ],
  );
  assert.equal(result.warnings.length, 2);
  assert.equal(result.jobs[1]?.description, null);
});

test('URLs inválidas rejeitam somente anúncios correspondentes', async () => {
  const result = await transport(async () => fromFixture('invalid-urls')).connector.fetchJobs(
    source,
  );
  assert.equal(result.acceptedCount, 0);
  assert.equal(result.rejectedCount, 9);
  assert(result.rejected.every(({ code }) => code === 'INVALID_JOB_URL'));
});

test('HTML perigoso é convertido em texto sem código ou atributos', async () => {
  const result = await transport(async () => fromFixture('unsafe-html')).connector.fetchJobs(
    source,
  );
  assert.equal(result.jobs[0]?.description, 'Texto seguroCandidatura');
});

test('updated_at e campos extras não documentados na listagem não viram data de publicação', async () => {
  const result = await transport(async () =>
    fromFixture('publication-missing'),
  ).connector.fetchJobs(source);
  assert.equal(result.jobs[0]?.publishedAt, null);
});

for (const payload of [null, [], {}, { jobs: null }, { jobs: {} }, { jobs: [], meta: {} }]) {
  test(`envelope ${JSON.stringify(payload)} é validado sem retry`, async () => {
    const t = transport(async () => Response.json(payload));
    if (
      payload &&
      typeof payload === 'object' &&
      'jobs' in payload &&
      Array.isArray(payload.jobs)
    ) {
      assert.equal((await t.connector.fetchJobs(source)).acceptedCount, 0);
    } else await assert.rejects(t.connector.fetchJobs(source), { code: 'UNEXPECTED_RESPONSE' });
    assert.equal(t.calls.length, 1);
  });
}

test('JSON malformado é falha integral e não retorna lista vazia', async () => {
  const t = transport(async () => new Response(raw('malformed-json.txt')));
  await assert.rejects(t.connector.fetchJobs(source), { code: 'INVALID_JSON', attempts: 1 });
  assert.equal(t.calls.length, 1);
});

function httpFixture(name: string): Response {
  const f = fixture(name) as { status: number; headers: Record<string, string>; body: string };
  return new Response(f.body, { status: f.status, headers: f.headers });
}

test('429 respeita Retry-After e usa no máximo três tentativas', async () => {
  const t = transport(async () => httpFixture('http-429'));
  await assert.rejects(t.connector.fetchJobs(source), {
    code: 'RATE_LIMITED',
    httpStatus: 429,
    attempts: 3,
  });
  assert.equal(t.calls.length, 3);
  assert.deepEqual(t.waits, [2000, 2000]);
});

test('500 seguido de sucesso usa backoff/jitter e mantém número de tentativas', async () => {
  let attempts = 0;
  const t = transport(async () =>
    ++attempts < 3 ? httpFixture('http-500') : fromFixture('empty'),
  );
  assert.equal((await t.connector.fetchJobs(source)).attempts, 3);
  assert.deepEqual(t.waits, [625, 1125]);
});

test('500 esgotado vira erro classificado, sem corpo externo nos detalhes', async () => {
  const t = transport(async () => httpFixture('http-500'));
  await assert.rejects(t.connector.fetchJobs(source), {
    code: 'UPSTREAM_SERVER_ERROR',
    attempts: 3,
  });
  assert.equal(t.calls.length, 3);
});

test('Retry-After aceita segundos/data; excesso encerra sem repetir antes da hora', async () => {
  const now = Date.parse('2026-10-11T00:00:00Z');
  assert.equal(retryAfterDelay('Sun, 11 Oct 2026 00:00:02 GMT', now), 2000);
  assert.equal(retryAfterDelay('0', now), 0);
  assert.equal(retryAfterDelay('-1', now), undefined);
  assert.equal(retryAfterDelay('invalid', now), undefined);
  const t = transport(
    async () => new Response('', { status: 429, headers: { 'Retry-After': '31' } }),
  );
  await assert.rejects(t.connector.fetchJobs(source), {
    code: 'RATE_LIMITED',
    retryAfterExceeded: true,
    attempts: 1,
  });
  assert.deepEqual(t.waits, []);
  assert.equal(t.calls.length, 1);
});

for (const [status, code] of [
  [400, 'HTTP_ERROR'],
  [401, 'BOARD_UNAVAILABLE'],
  [403, 'BOARD_UNAVAILABLE'],
  [404, 'BOARD_NOT_FOUND'],
  [410, 'BOARD_NOT_FOUND'],
  [302, 'REDIRECT_NOT_ALLOWED'],
] as const) {
  test(`HTTP ${status} não é repetido nem seguido`, async () => {
    const t = transport(
      async () =>
        new Response('private upstream content', {
          status,
          headers: { Location: 'http://127.0.0.1' },
        }),
    );
    await assert.rejects(t.connector.fetchJobs(source), { code, httpStatus: status, attempts: 1 });
    assert.equal(t.calls.length, 1);
    assert.deepEqual(t.waits, []);
  });
}

test('falha de rede é limitada e não vaza mensagem do transporte', async () => {
  const t = transport(async () => {
    throw new Error('private transport content');
  });
  await assert.rejects(t.connector.fetchJobs(source), (error: unknown) => {
    assert(error instanceof IntegrationError);
    assert.equal(error.code, 'NETWORK_ERROR');
    assert.equal(error.attempts, 3);
    assert(!JSON.stringify(error).includes('private'));
    return true;
  });
});

test('timeout aborta cada tentativa aos 10s, com relógio controlado', async (context) => {
  const f = fixture('http-timeout') as { timeoutMs: number; attempts: number };
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const t = transport(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const checked = assert.rejects(t.connector.fetchJobs(source), {
    code: 'TIMEOUT',
    attempts: f.attempts,
  });
  for (let i = 0; i < f.attempts; i++) {
    await nextTurn();
    assert.equal(t.calls.length, i + 1);
    context.mock.timers.tick(f.timeoutMs);
  }
  await checked;
  assert.equal(HTTP_POLICY.timeoutMs, f.timeoutMs);
  assert(t.calls.every(({ init }) => init.signal?.aborted));
});

test('limite do corpo considera Content-Length e bytes efetivamente lidos', async () => {
  for (const response of [
    new Response('{}', { headers: { 'Content-Length': String(HTTP_POLICY.maxBodyBytes + 1) } }),
    new Response(new Uint8Array(HTTP_POLICY.maxBodyBytes + 1)),
  ]) {
    const t = transport(async () => response);
    await assert.rejects(t.connector.fetchJobs(source), {
      code: 'RESPONSE_TOO_LARGE',
      attempts: 1,
    });
    assert.equal(t.calls.length, 1);
  }
});
