import { Module } from '@nestjs/common';
import { EnvironmentModule } from './config/environment.module';
import { HealthModule } from './health/health.module';
import { ConnectorsModule } from './connectors/connectors.module';

@Module({ imports: [EnvironmentModule, HealthModule, ConnectorsModule] })
export class AppModule {}
