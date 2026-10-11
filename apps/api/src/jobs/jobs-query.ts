import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client';

export class InvalidQueryError extends BadRequestException {
  constructor(readonly safeMessage: string) {
    super(safeMessage);
  }
}
const empty = (value: unknown) =>
  typeof value === 'string' ? value.normalize('NFC').trim() || undefined : value;
const text = (max: number) => z.preprocess(empty, z.string().max(max).optional());
const integer = (fallback: string, max: number) =>
  z.preprocess(
    empty,
    z
      .string()
      .regex(/^[0-9]+$/)
      .default(fallback)
      .transform(Number)
      .pipe(z.number().int().min(1).max(max)),
  );
const schema = z
  .object({
    q: text(200),
    location: text(100),
    platform: z.preprocess(empty, z.enum(['GREENHOUSE', 'ASHBY', 'LEVER']).optional()),
    workplaceType: z.preprocess(
      empty,
      z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN']).optional(),
    ),
    sourceId: z.preprocess(empty, z.uuid().optional()),
    page: integer('1', 2147483647),
    pageSize: integer('20', 100),
  })
  .refine((value) => (value.page - 1) * value.pageSize <= 2147483647, { path: ['page'] });
const messages: Record<string, string> = {
  q: 'O parâmetro q deve ser texto com até 200 caracteres.',
  location: 'O parâmetro location deve ser texto com até 100 caracteres.',
  platform: 'platform deve ser GREENHOUSE, ASHBY ou LEVER.',
  workplaceType: 'workplaceType deve ser REMOTE, HYBRID, ONSITE ou UNKNOWN.',
  sourceId: 'sourceId deve ser um UUID válido.',
  page: 'page deve ser inteiro a partir de 1, com deslocamento máximo de 2147483647.',
  pageSize: 'pageSize deve ser inteiro entre 1 e 100.',
};
export function parseJobsQuery(value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new InvalidQueryError(
      messages[String(parsed.error.issues[0]?.path[0])] ?? 'Parâmetros de consulta inválidos.',
    );
  return parsed.data;
}
export type JobsQuery = ReturnType<typeof parseJobsQuery>;
// Prisma's contains uses LIKE; escape wildcard characters for a literal substring search.
const literal = (value: string) => value.replace(/[\\%_]/g, '\\$&');
export function jobsWhere(query: JobsQuery): Prisma.JobWhereInput {
  return {
    ...(query.q
      ? {
          OR: [
            { title: { contains: literal(query.q), mode: 'insensitive' } },
            { description: { contains: literal(query.q), mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.location
      ? { location: { contains: literal(query.location), mode: 'insensitive' } }
      : {}),
    ...(query.platform ? { source: { platform: query.platform } } : {}),
    ...(query.sourceId ? { jobSourceId: query.sourceId } : {}),
    ...(query.workplaceType ? { workplaceType: query.workplaceType } : {}),
  };
}
