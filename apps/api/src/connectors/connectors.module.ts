import { Module } from '@nestjs/common';
import { GreenhouseConnector } from './greenhouse/greenhouse.connector';
import { AshbyConnector } from './ashby/ashby.connector';
import { LeverConnector } from './lever/lever.connector';
import { ConnectorRegistry } from './connector-registry';

@Module({
  providers: [
    {
      provide: ConnectorRegistry,
      useFactory: () =>
        new ConnectorRegistry([
          new GreenhouseConnector(),
          new AshbyConnector(),
          new LeverConnector(),
        ]),
    },
  ],
  exports: [ConnectorRegistry],
})
export class ConnectorsModule {}
