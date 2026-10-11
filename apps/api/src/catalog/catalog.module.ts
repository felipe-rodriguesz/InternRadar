import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [DatabaseModule],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
