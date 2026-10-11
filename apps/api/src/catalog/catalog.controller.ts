import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { parseCatalogQuery } from './catalog-query';

@Controller()
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}
  @Get('companies')
  @Header('Cache-Control', 'no-store')
  companies(@Query() query: unknown) {
    return this.catalog.companies(parseCatalogQuery('companies', query));
  }
  @Get('sources')
  @Header('Cache-Control', 'no-store')
  sources(@Query() query: unknown) {
    return this.catalog.sources(parseCatalogQuery('sources', query));
  }
  @Get('sync-runs')
  @Header('Cache-Control', 'no-store')
  runs(@Query() query: unknown) {
    return this.catalog.runs(parseCatalogQuery('runs', query));
  }
}
