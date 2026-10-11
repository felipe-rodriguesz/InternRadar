import { IntegrationError } from '../integration-error';
import { PublicJobsHttp } from '../public-jobs-http';
export { HTTP_POLICY, retryAfterDelay } from '../public-jobs-http';
export type { HttpDependencies } from '../public-jobs-http';

export function greenhouseJobsUrl(boardKey: string): URL {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(boardKey)) throw new IntegrationError('INVALID_SOURCE');
  return new URL(`https://boards-api.greenhouse.io/v1/boards/${boardKey}/jobs?content=true`);
}
export class GreenhouseHttp extends PublicJobsHttp {
  listJobs(boardKey: string) {
    return this.get(greenhouseJobsUrl(boardKey));
  }
}
