import type { NormalizedJob } from '../../../src/connectors/contracts';

/** Synthetic fixtures, exclusively for the isolated browser-test schema. Never a product seed. */
export const browserJobs: NormalizedJob[] = Array.from({ length: 23 }, (_, index) => ({
  externalId: `browser-fixture-${index}`,
  title:
    index === 0 ? 'Fixture React Intern' : `Fixture Software ${String(index).padStart(2, '0')}`,
  description: 'Anúncio sintético para testes de interface. Não é oportunidade real.',
  location: index === 0 ? 'Curitiba, Brasil' : index % 2 ? 'São Paulo, Brasil' : null,
  workplaceType: index === 0 ? 'REMOTE' : index % 2 ? 'HYBRID' : 'UNKNOWN',
  employmentType: index === 0 ? 'Intern' : null,
  jobUrl: `https://example.com/jobs/browser-fixture-${index}`,
  publishedAt: null,
}));
