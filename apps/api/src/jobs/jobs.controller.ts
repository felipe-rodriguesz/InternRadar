import { Controller, Get, Header, Inject, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { parseJobsQuery } from './jobs-query';

@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.jobs.detail(id);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: unknown) {
    return this.jobs.list(parseJobsQuery(query));
  }
}
