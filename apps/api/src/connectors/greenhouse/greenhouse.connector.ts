import type { JobConnector, JobSourceConfig } from '../contracts';
import { IntegrationError } from '../integration-error';
import { validateSource } from '../normalization';
import { GreenhouseHttp } from './greenhouse-http';
import { normalizeGreenhouse } from './greenhouse-normalizer';

export class GreenhouseConnector implements JobConnector {
  readonly platform = 'GREENHOUSE';
  constructor(private readonly http = new GreenhouseHttp()) {}

  async fetchJobs(input: JobSourceConfig) {
    const source = validateSource(input);
    if (source.platform !== this.platform || source.region !== 'GLOBAL')
      throw new IntegrationError('INVALID_SOURCE');
    const { payload, attempts } = await this.http.listJobs(source.boardKey);
    try {
      return normalizeGreenhouse(payload, attempts);
    } catch (error) {
      if (error instanceof IntegrationError) error.attempts = attempts;
      throw error;
    }
  }
}
