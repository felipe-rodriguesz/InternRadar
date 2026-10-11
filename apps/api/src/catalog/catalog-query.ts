import { z } from 'zod';
import { InvalidQueryError } from '../jobs/jobs-query';

const empty = (v: unknown) => (typeof v === 'string' ? v.normalize('NFC').trim() || undefined : v);
const integer = (fallback: string, max: number) =>
  z.preprocess(
    empty,
    z
      .string()
      .regex(/^\d+$/)
      .default(fallback)
      .transform(Number)
      .pipe(z.number().int().min(1).max(max)),
  );
const pagination = { page: integer('1', 2147483647), pageSize: integer('20', 100) };
const platform = z.preprocess(empty, z.enum(['GREENHOUSE', 'ASHBY', 'LEVER']).optional());
const uuid = z.preprocess(empty, z.uuid().optional());
const fields = {
  companies: z.object({ ...pagination, q: z.preprocess(empty, z.string().max(200).optional()) }),
  sources: z.object({
    ...pagination,
    platform,
    companyId: uuid,
    enabled: z.preprocess(
      empty,
      z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true')),
    ),
  }),
  runs: z.object({
    ...pagination,
    platform,
    sourceId: uuid,
    status: z.preprocess(empty, z.enum(['RUNNING', 'SUCCESS', 'FAILED']).optional()),
  }),
};
export function parseCatalogQuery<T extends keyof typeof fields>(
  kind: T,
  value: unknown,
): z.output<(typeof fields)[T]> {
  const result = fields[kind].safeParse(value);
  if (!result.success) {
    const field = String(result.error.issues[0]?.path[0] ?? 'query');
    const messages: Record<string, string> = {
      page: 'page deve ser inteiro a partir de 1.',
      pageSize: 'pageSize deve ser inteiro entre 1 e 100.',
      companyId: 'companyId deve ser UUID válido.',
      sourceId: 'sourceId deve ser UUID válido.',
      platform: 'platform deve ser GREENHOUSE, ASHBY ou LEVER.',
      enabled: 'enabled deve ser true ou false.',
      status: 'status deve ser RUNNING, SUCCESS ou FAILED.',
      q: 'q deve ter até 200 caracteres.',
    };
    throw new InvalidQueryError(messages[field] ?? 'Consulta inválida.');
  }
  if ((result.data.page - 1) * result.data.pageSize > 2147483647)
    throw new InvalidQueryError('Deslocamento da página excede o limite.');
  return result.data as z.output<(typeof fields)[T]>;
}
