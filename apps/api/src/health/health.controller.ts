import { Controller, Get, Header } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  @Header('Cache-Control', 'no-store')
  check() {
    return { status: 'ok', service: 'internradar-api', database: { status: 'not_checked' } };
  }
}
