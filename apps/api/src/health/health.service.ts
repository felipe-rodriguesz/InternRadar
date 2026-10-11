import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async check() {
    try {
      await this.database.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE' });
    }
    return { status: 'ok', service: 'internradar-api', database: { status: 'connected' } } as const;
  }
}
