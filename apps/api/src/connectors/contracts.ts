export type SourcePlatform = 'GREENHOUSE' | 'ASHBY' | 'LEVER';
export type SourceRegion = 'GLOBAL' | 'EU';
export type WorkplaceType = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';

export interface JobSourceConfig {
  id: string;
  platform: SourcePlatform;
  boardKey: string;
  region: SourceRegion;
}

/** Plain text only. Consumers must never render these strings as trusted HTML. */
export interface NormalizedJob {
  externalId: string;
  title: string;
  description: string | null;
  location: string | null;
  workplaceType: WorkplaceType;
  employmentType: string | null;
  jobUrl: string;
  publishedAt: Date | null;
}

export type RejectionCode = 'INVALID_ITEM' | 'INVALID_ID' | 'EMPTY_TITLE' | 'INVALID_JOB_URL';
export interface RejectedItem {
  index: number;
  externalId: string | null;
  code: RejectionCode;
}
export interface NormalizationWarning {
  index: number;
  code: 'INVALID_DATE' | 'INVALID_OPTIONAL_FIELD';
}
export interface CollectionResult {
  jobs: NormalizedJob[];
  rejected: RejectedItem[];
  warnings: NormalizationWarning[];
  receivedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  attempts: number;
}

export interface JobConnector {
  readonly platform: SourcePlatform;
  fetchJobs(source: JobSourceConfig): Promise<CollectionResult>;
}
