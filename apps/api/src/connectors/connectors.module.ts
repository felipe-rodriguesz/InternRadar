import { Module } from '@nestjs/common';
import { GreenhouseConnector } from './greenhouse/greenhouse.connector';

@Module({
  providers: [{ provide: GreenhouseConnector, useFactory: () => new GreenhouseConnector() }],
  exports: [GreenhouseConnector],
})
export class ConnectorsModule {}
