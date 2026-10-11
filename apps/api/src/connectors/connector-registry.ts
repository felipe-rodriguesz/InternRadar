import type { JobConnector, SourcePlatform } from './contracts';

export class ConnectorRegistry {
  private readonly connectors: Map<SourcePlatform, JobConnector>;
  constructor(connectors: JobConnector[]) {
    this.connectors = new Map(connectors.map((connector) => [connector.platform, connector]));
    if (this.connectors.size !== connectors.length)
      throw new Error('Duplicate connector registration');
  }
  get(platform: SourcePlatform): JobConnector | undefined {
    return this.connectors.get(platform);
  }
}
