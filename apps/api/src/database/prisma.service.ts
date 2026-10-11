import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ENVIRONMENT } from '../config/environment';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { databaseAdapter } from './client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    super({ adapter: databaseAdapter(environment.DATABASE_URL) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
