import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { parseJobsQuery } from './jobs-query';

@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: unknown) {
    return this.jobs.list(parseJobsQuery(query));
  }
}
