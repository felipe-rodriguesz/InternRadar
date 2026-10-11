import { Module } from '@nestjs/common';
import { EnvironmentModule } from '../config/environment.module';
import { DatabaseModule } from '../database/database.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { SyncService } from './sync.service';

@Module({
  imports: [EnvironmentModule, DatabaseModule, ConnectorsModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
