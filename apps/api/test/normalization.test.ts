import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  htmlToPlainText,
  optionalDate,
  plainLabel,
  validJobUrl,
  validateSource,
} from '../src/connectors/normalization';

const source = {
  id: 'ce96e6c0-48b0-42e3-b2c7-285a10fd4822',
  platform: 'GREENHOUSE',
  boardKey: 'fixture',
};

test('configuração aceita somente identificadores e plataformas; região padrão GLOBAL', () => {
  assert.equal(validateSource(source).region, 'GLOBAL');
  assert.equal(validateSource({ ...source, platform: 'LEVER', region: 'EU' }).region, 'EU');
  for (const boardKey of [
    '',
    '../figma',
    '%2ffigma',
    'https://evil.example/a',
    'figma?x=1',
    'a/b',
    'a\\b',
    'a\n',
  ]) {
    assert.throws(() => validateSource({ ...source, boardKey }), { code: 'INVALID_SOURCE' });
  }
  for (const input of [
    { ...source, platform: 'OTHER' },
    { ...source, id: 'not-uuid' },
    { ...source, region: 'US' },
  ]) {
    assert.throws(() => validateSource(input), { code: 'INVALID_SOURCE' });
  }
});

test('sanitização remove subárvores executáveis, tags, atributos e comentários', () => {
  assert.equal(
    htmlToPlainText(
      '<p>Seguro<script>bad()</script><style>bad</style><iframe>bad</iframe><svg><text>bad</text></svg><object>bad</object><template>bad</template><img src=x onerror=bad()> final</p>',
    ),
    'Seguro final',
  );
  assert.equal(htmlToPlainText('<script>bad()</script>'), null);
  assert.equal(htmlToPlainText('<p>um</p><p>dois</p>'), 'um\n\ndois');
});

test('entidades, Unicode, espaços e marcação malformada viram texto, sem DOM', () => {
  assert.equal(
    htmlToPlainText('&amp;lt;p&amp;gt;Olá &amp;amp; mundo&amp;lt;/p&amp;gt;'),
    'Olá & mundo',
  );
  assert.equal(htmlToPlainText('&lt;script&gt;bad()&lt;/script&gt;&lt;p&gt;Bom&lt;/p&gt;'), 'Bom');
  assert.equal(plainLabel('  Esta\u0301gio <b>em</b>\nSoftware\u0000  '), 'Estágio em Software');
  assert.equal(htmlToPlainText('<p>aberto<b>texto'), 'abertotexto');
});

test('links http(s) de carreira são navegação, nunca endpoints de coleta', () => {
  assert.equal(
    validJobUrl('https://CAREERS.example.com/jobs/1?gh_jid=1#apply'),
    'https://careers.example.com/jobs/1?gh_jid=1#apply',
  );
  assert.equal(validJobUrl('http://example.com/jobs/1'), 'http://example.com/jobs/1');
  for (const url of [
    'javascript:bad()',
    'data:text/html,x',
    '//example.com/a',
    'https://user:pass@example.com/a',
    'https://localhost/a',
    'http://127.1/a',
    'http://2130706433/a',
    'http://[::1]/a',
    'https://host.internal/a',
    'https://example.com:123/a',
    'https://example.com/a\nb',
    'https://example.com\\evil',
  ]) {
    assert.equal(validJobUrl(url), null, url);
  }
});

test('datas opcionais não são fabricadas; valores inválidos geram aviso não fatal', () => {
  for (const value of [undefined, null, ''])
    assert.deepEqual(optionalDate(value), { value: null, invalid: false });
  for (const value of ['2026-02-30T10:00:00Z', 'yesterday', 123, '2026-10-11'])
    assert.deepEqual(optionalDate(value), { value: null, invalid: true });
  assert.equal(
    optionalDate('2026-10-11T10:00:00-03:00').value?.toISOString(),
    '2026-10-11T13:00:00.000Z',
  );
});
