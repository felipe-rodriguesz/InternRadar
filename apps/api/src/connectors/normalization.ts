import { isIP } from 'node:net';
import { Parser } from 'htmlparser2';
import { decodeHTML } from 'entities';
import { z } from 'zod';
import type { JobSourceConfig } from './contracts';
import { IntegrationError } from './integration-error';

const sourceSchema = z.object({
  id: z.uuid(),
  platform: z.enum(['GREENHOUSE', 'ASHBY', 'LEVER']),
  boardKey: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  region: z.enum(['GLOBAL', 'EU']).default('GLOBAL'),
});

export function validateSource(input: unknown): JobSourceConfig {
  const result = sourceSchema.safeParse(input);
  if (!result.success) throw new IntegrationError('INVALID_SOURCE');
  return result.data;
}

const suppressed = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'template',
  'noscript',
]);
const blocks = new Set([
  'p',
  'div',
  'br',
  'li',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'section',
  'tr',
  'td',
]);

/** Parse without a DOM/network. Drop executable/non-content subtrees and all attributes. */
export function htmlToPlainText(value: string): string | null {
  let depth = 0;
  const chunks: string[] = [];
  const parser = new Parser(
    {
      onopentag(name) {
        if (suppressed.has(name)) depth++;
        if (!depth && blocks.has(name)) chunks.push('\n');
      },
      ontext(text) {
        if (!depth) chunks.push(text);
      },
      onclosetag(name) {
        if (suppressed.has(name)) depth--;
        if (!depth && blocks.has(name)) chunks.push('\n');
      },
    },
    { decodeEntities: true },
  );
  // Greenhouse returns descriptions with HTML entities; support one extra encoded layer.
  parser.end(decodeHTML(decodeHTML(value)));
  const text = chunks
    .join('')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\p{Cc}/gu, (character) => (['\n', '\t'].includes(character) ? character : ''))
    .replace(/[\t \u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

export function plainLabel(value: string): string | null {
  return htmlToPlainText(value)?.replace(/\s+/g, ' ').trim() || null;
}

/** Validate a navigation link only; it is never fetched by the backend. Custom career domains are allowed. */
export function validJobUrl(value: string): string | null {
  if (value.length > 4096 || /[\s\\]|\p{Cc}/u.test(value)) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const validLabels = host
      .split('.')
      .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes('.') ||
      !validLabels ||
      host.length > 253 ||
      host.endsWith('.') ||
      isIP(host) ||
      host.startsWith('[') ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function optionalDate(value: unknown): { value: Date | null; invalid: boolean } {
  if (value === undefined || value === null || value === '') return { value: null, invalid: false };
  const iso = z.iso.datetime({ offset: true }).safeParse(value);
  if (!iso.success) return { value: null, invalid: true };
  const date = new Date(iso.data);
  return Number.isFinite(date.getTime())
    ? { value: date, invalid: false }
    : { value: null, invalid: true };
}
