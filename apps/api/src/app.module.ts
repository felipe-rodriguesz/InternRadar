import { CatalogModule } from './catalog/catalog.module';
import { Module } from '@nestjs/common';
import { EnvironmentModule } from './config/environment.module';
import { HealthModule } from './health/health.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { JobsModule } from './jobs/jobs.module';

@Module({ imports: [EnvironmentModule, HealthModule, ConnectorsModule, JobsModule, CatalogModule] })
export class AppModule {}
