import console from 'node:console';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { GreenhouseConnector } from './greenhouse.connector';
import { IntegrationError } from '../integration-error';

const start = performance.now();
void new GreenhouseConnector()
  .fetchJobs({
    id: '7e804636-9510-40a4-aa40-620b4b4ea3a2',
    platform: 'GREENHOUSE',
    boardKey: process.argv[2] ?? 'figma',
    region: 'GLOBAL',
  })
  .then(
    (result) => {
      console.log(
        JSON.stringify({
          mode: 'read-only; no database',
          platform: 'GREENHOUSE',
          checkedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - start),
          received: result.receivedCount,
          accepted: result.acceptedCount,
          rejected: result.rejected,
          warnings: result.warnings,
          attempts: result.attempts,
          publicationDates: result.jobs.filter((job) => job.publishedAt !== null).length,
          knownWorkplaces: result.jobs.filter((job) => job.workplaceType !== 'UNKNOWN').length,
        }),
      );
    },
    (error: unknown) => {
      console.error(
        JSON.stringify(
          error instanceof IntegrationError ? error.toJSON() : { code: 'INTERNAL_ERROR' },
        ),
      );
      process.exitCode = 1;
    },
  );
