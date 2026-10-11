import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import type { JobSourceConfig } from '../src/connectors/contracts';
import {
  AshbyConnector,
  canonicalAshbyUrl,
  normalizeAshby,
} from '../src/connectors/ashby/ashby.connector';
import { LeverConnector, leverUrl } from '../src/connectors/lever/lever.connector';
import { PublicJobsHttp, HTTP_POLICY } from '../src/connectors/public-jobs-http';
import type { HttpDependencies } from '../src/connectors/public-jobs-http';
import { ConnectorRegistry } from '../src/connectors/connector-registry';
import { validateCollection } from '../src/sync/validate-collection';

const fixture = (platform: string, name: string): unknown =>
  JSON.parse(
    readFileSync(join(__dirname, 'fixtures', platform, `${name}.json`), 'utf8'),
  ) as unknown;
const source: JobSourceConfig = {
  id: '17d107c2-7c63-4c77-bf57-90799bbeb45c',
  boardKey: 'fixture',
  platform: 'ASHBY',
  region: 'GLOBAL',
};
function setup(fetcher: HttpDependencies['fetch']) {
  const calls: URL[] = [];
  const waits: number[] = [];
  const http = new PublicJobsHttp({
    fetch: async (url, init) => {
      calls.push(url);
      assert.equal(init.redirect, 'manual');
      return fetcher(url, init);
    },
    sleep: async (ms) => {
      waits.push(ms);
    },
    now: () => 0,
    random: () => 0,
  });
  return { ashby: new AshbyConnector(http), lever: new LeverConnector(http), http, calls, waits };
}
const response = (value: unknown) => new Response(JSON.stringify(value));

test('Ashby official fields, stable URL hash, plain preferred and explicit publication', async () => {
  const t = setup(async () => response(fixture('ashby', 'valid')));
  const result = await t.ashby.fetchJobs(source);
  assert.equal(t.calls[0]?.href, 'https://api.ashbyhq.com/posting-api/job-board/fixture');
  const job = result.jobs[0];
  assert(job);
  assert.match(job.externalId, /^urlsha256:[a-f0-9]{64}$/);
  assert.equal(job.description, 'Aprenda com segurança.');
  assert.equal(job.workplaceType, 'REMOTE');
  assert.equal(job.employmentType, 'Intern');
  assert.equal(job.publishedAt?.toISOString(), '2026-10-01T12:30:00.000Z');
  assert.equal(job.isListed, true);
  assert.equal(validateCollection(result).jobs.length, 1);
});
test('Ashby canonicalization preserves publication and case boundaries', () => {
  const expected = 'https://jobs.ashbyhq.com/fixture/job-A';
  for (const url of [
    expected,
    `${expected}/`,
    `${expected}?utm_source=x&ref=y#apply`,
    'https://JOBS.ASHBYHQ.COM:443/fixture/./job-A/',
  ])
    assert.equal(canonicalAshbyUrl(url), expected);
  assert.notEqual(
    canonicalAshbyUrl(expected),
    canonicalAshbyUrl(expected.replace('job-A', 'job-B')),
  );
  assert.notEqual(
    canonicalAshbyUrl(expected),
    canonicalAshbyUrl(expected.replace('job-A', 'job-a')),
  );
  for (const value of [
    'https://example.com/jobs?id=1',
    'https://jobs.ashbyhq.com/fixture',
    'https://jobs.ashbyhq.com/fixture/job-A/apply',
    'javascript:alert(1)',
    'https://user:secret@jobs.ashbyhq.com/fixture/job-A',
  ])
    assert.equal(canonicalAshbyUrl(value), null);
});
test('Ashby duplicates, invalid items, unlisted, safe HTML and unknown dates', () => {
  const r = normalizeAshby(fixture('ashby', 'mixed'), 1);
  assert.equal(r.receivedCount, 7);
  assert.equal(r.acceptedCount, 3);
  assert.equal(r.rejectedCount, 4);
  assert.equal(r.jobs[1]?.isListed, false);
  assert.equal(r.jobs[2]?.description, 'Texto');
  assert.equal(r.jobs[2]?.publishedAt, null);
  assert.equal(r.jobs[2]?.workplaceType, 'UNKNOWN');
  assert(r.warnings.some((w) => w.code === 'INVALID_DATE'));
  assert.equal(validateCollection(r).jobs.length, 3);
});
for (const platform of ['ashby', 'lever'] as const) {
  const config = {
    ...source,
    platform: platform === 'ashby' ? ('ASHBY' as const) : ('LEVER' as const),
  };
  test(`${platform}: empty, absent fields and malformed envelope`, async () => {
    const empty = await setup(async () => response(fixture(platform, 'empty')))[platform].fetchJobs(
      config,
    );
    assert.equal(empty.receivedCount, 0);
    assert.equal(empty.jobs.length, 0);
    const r = await setup(async () => response(fixture(platform, 'optional-missing')))[
      platform
    ].fetchJobs(config);
    const job = r.jobs[0];
    assert(job);
    for (const field of ['description', 'location', 'publishedAt', 'employmentType'] as const)
      assert.equal(job[field], null);
    assert.equal(job.workplaceType, 'UNKNOWN');
    await assert.rejects(setup(async () => response({ wrong: [] }))[platform].fetchJobs(config), {
      code: 'UNEXPECTED_RESPONSE',
    });
  });
  for (const [status, code, attempts] of [
    [403, 'BOARD_UNAVAILABLE', 1],
    [404, 'BOARD_NOT_FOUND', 1],
    [429, 'RATE_LIMITED', 3],
    [500, 'UPSTREAM_SERVER_ERROR', 3],
    [302, 'REDIRECT_NOT_ALLOWED', 1],
  ] as const) {
    test(`${platform}: HTTP ${status} classified with bounded retries`, async () => {
      const t = setup(async () => new Response('untrusted secret body', { status }));
      await assert.rejects(t[platform].fetchJobs(config), { code, attempts });
      assert.equal(t.calls.length, attempts);
      assert.equal(t.waits.length, attempts - 1);
    });
  }
  test(`${platform}: malformed JSON, network, body size and forbidden source`, async () => {
    await assert.rejects(setup(async () => new Response('{'))[platform].fetchJobs(config), {
      code: 'INVALID_JSON',
    });
    await assert.rejects(
      setup(async () => {
        throw new Error('private network detail');
      })[platform].fetchJobs(config),
      { code: 'NETWORK_ERROR', attempts: 3 },
    );
    await assert.rejects(
      setup(
        async () =>
          new Response('{}', {
            headers: { 'content-length': String(HTTP_POLICY.maxBodyBytes + 1) },
          }),
      )[platform].fetchJobs(config),
      { code: 'RESPONSE_TOO_LARGE' },
    );
    const t = setup(async () => {
      throw new Error('must not fetch');
    });
    await assert.rejects(t[platform].fetchJobs({ ...config, boardKey: '../private' }), {
      code: 'INVALID_SOURCE',
    });
    assert.equal(t.calls.length, 0);
  });
  test(`${platform}: real abort-signal timeout path`, async (ctx) => {
    ctx.mock.timers.enable({ apis: ['setTimeout'] });
    const t = setup(
      async (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          }),
        ),
    );
    const check = assert.rejects(t[platform].fetchJobs(config), { code: 'TIMEOUT', attempts: 3 });
    for (let i = 0; i < 3; i++) {
      ctx.mock.timers.tick(HTTP_POLICY.timeoutMs);
      await nextTurn();
    }
    await check;
  });
}
test('Lever normalizes documented categories/sections/workplace; createdAt is not publication', async () => {
  const t = setup(async () => response(fixture('lever', 'valid')));
  const r = await t.lever.fetchJobs({ ...source, platform: 'LEVER', region: 'EU' });
  assert.equal(t.calls[0]?.hostname, 'api.eu.lever.co');
  assert.equal(t.calls[0]?.search, '?mode=json&skip=0&limit=100');
  assert.equal(r.jobs[0]?.workplaceType, 'HYBRID');
  assert.equal(r.jobs[0]?.publishedAt, null);
  assert(r.jobs[0]?.description?.includes('TypeScript'));
  assert(!r.jobs[0]?.description?.includes('danger'));
  assert.equal(r.jobs[0]?.employmentType, 'Full-time');
  assert.throws(() => leverUrl(source, 0), { code: 'INVALID_SOURCE' });
});
test('Lever multiple full pages, cross-page duplicates and final empty page', async () => {
  const item = (fixture('lever', 'valid') as Record<string, unknown>[])[0];
  const t = setup(async (url) => {
    const skip = Number(url.searchParams.get('skip'));
    return response(
      skip < 200
        ? Array.from({ length: 100 }, (_, i) => ({
            ...item,
            id: `fixture-${skip === 100 && i === 0 ? 0 : skip + i}`,
          }))
        : [],
    );
  });
  const r = await t.lever.fetchJobs({ ...source, platform: 'LEVER' });
  assert.deepEqual(
    t.calls.map((u) => u.searchParams.get('skip')),
    ['0', '100', '200'],
  );
  assert.equal(r.jobs.length, 199);
  assert.equal(r.rejectedCount, 1);
  assert.equal(r.receivedCount, 200);
  assert.equal(r.attempts, 3);
  assert.equal(validateCollection(r).jobs.length, 199);
});
test('Lever pagination maximum fails instead of reporting truncated success', async () => {
  const item = (fixture('lever', 'valid') as Record<string, unknown>[])[0];
  const t = setup(async () =>
    response(Array.from({ length: 100 }, (_, i) => ({ ...item, id: `fixture-${i}` }))),
  );
  await assert.rejects(t.lever.fetchJobs({ ...source, platform: 'LEVER' }), {
    code: 'PAGINATION_LIMIT',
  });
  assert.equal(t.calls.length, 100);
});
test('Lever mixed invalid items and arbitrary transport destinations', async () => {
  const t = setup(async () => response(fixture('lever', 'mixed')));
  const r = await t.lever.fetchJobs({ ...source, platform: 'LEVER' });
  assert.equal(r.acceptedCount, 1);
  assert.equal(r.rejectedCount, 5);
  await assert.rejects(t.http.get(new URL('https://example.com/')), { code: 'INVALID_SOURCE' });
  await assert.rejects(t.http.get(new URL('http://api.lever.co/v0/postings/fixture')), {
    code: 'INVALID_SOURCE',
  });
});
test('registry dispatches all adapters and rejects duplicate registrations', () => {
  const a = new AshbyConnector();
  const l = new LeverConnector();
  const registry = new ConnectorRegistry([a, l]);
  assert.equal(registry.get('ASHBY'), a);
  assert.equal(registry.get('LEVER'), l);
  assert.equal(registry.get('GREENHOUSE'), undefined);
  assert.throws(() => new ConnectorRegistry([a, a]));
});

test('Ashby conflicting duplicate visibility never republishes an explicitly unlisted posting', () => {
  const listed = {
    title: 'Fixture',
    jobUrl: 'https://jobs.ashbyhq.com/fixture/job-A',
    isListed: true,
  };
  const hidden = { ...listed, isListed: false };
  for (const jobs of [
    [listed, hidden],
    [hidden, listed],
  ]) {
    const r = normalizeAshby({ jobs }, 1);
    assert.equal(r.jobs.length, 1);
    assert.equal(r.rejectedCount, 1);
    assert.equal(r.jobs[0]?.isListed, false);
  }
});
