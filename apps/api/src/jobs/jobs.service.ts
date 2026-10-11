import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { validJobUrl } from '../connectors/normalization';
import { jobsWhere } from './jobs-query';
import type { JobsQuery } from './jobs-query';

const jobSelect = {
  id: true,
  title: true,
  location: true,
  workplaceType: true,
  employmentType: true,
  jobUrl: true,
  publishedAt: true,
  firstSeenAt: true,
  lastSeenAt: true,
  status: true,
  source: {
    select: { id: true, platform: true, company: { select: { id: true, name: true } } },
  },
} as const;

@Injectable()
export class JobsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async detail(id: string) {
    const row = await this.prisma.job.findUnique({
      where: { id },
      select: { ...jobSelect, description: true, isListed: true },
    });
    if (!row) throw new NotFoundException();
    const { source, jobUrl, ...job } = row;
    return {
      ...job,
      company: source.company,
      source: { id: source.id, platform: source.platform },
      jobUrl: validJobUrl(jobUrl),
    };
  }

  async list(query: JobsQuery) {
    const { page, pageSize } = query;
    const where = jobsWhere(query);
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.job.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ firstSeenAt: 'desc' }, { id: 'desc' }],
          select: jobSelect,
        }),
        this.prisma.job.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const items = rows.map(({ source, jobUrl, ...job }) => ({
      ...job,
      company: source.company,
      source: { id: source.id, platform: source.platform },
      // Legacy invalid links remain visible as data errors, never actionable links.
      jobUrl: validJobUrl(jobUrl),
    }));
    return { items, page, pageSize, total };
  }
}
