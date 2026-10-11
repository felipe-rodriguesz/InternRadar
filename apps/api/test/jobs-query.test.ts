import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseJobsQuery, InvalidQueryError } from '../src/jobs/jobs-query';

test('query aplica defaults, ignora filtros vazios, trim e Unicode NFC', () => {
  const query = parseJobsQuery({
    q: '  Cafe\u0301  ',
    platform: '',
    sourceId: ' ',
    workplaceType: '',
    location: '   ',
  });
  assert.equal(query.q, 'Café');
  assert.equal(query.location, undefined);
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, 20);
});
test('query recusa arrays, limites, enums, UUID, frações e offsets inseguros', () => {
  for (const query of [
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: '1e3' },
    { pageSize: '101' },
    { page: '2147483647', pageSize: '100' },
    { q: ['a', 'b'] },
    { q: 'a'.repeat(201) },
    { location: 'a'.repeat(101) },
    { sourceId: 'missing' },
    { platform: 'OTHER' },
    { workplaceType: 'other' },
  ]) {
    assert.throws(() => parseJobsQuery(query), InvalidQueryError);
  }
});
