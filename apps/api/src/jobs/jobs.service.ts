import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { validJobUrl } from '../connectors/normalization';
import { jobsWhere } from './jobs-query';
import type { JobsQuery } from './jobs-query';

@Injectable()
export class JobsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
          select: {
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
          },
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
