import type { PrismaClient } from '../src/generated/prisma/client';
import { seedSources } from './seed-data';

export async function seedDatabase(client: PrismaClient): Promise<void> {
  await client.$transaction(async (tx) => {
    for (const entry of seedSources) {
      const { platform, boardKey, region, companyId, name, websiteUrl } = entry;
      const identity = { platform, boardKey, region };
      const existing = await tx.jobSource.findUnique({
        where: { platform_boardKey_region: identity },
      });
      // Não reassociar uma fonte já cadastrada a outra empresa.
      const company = await tx.company.upsert({
        where: { id: existing?.companyId ?? companyId },
        create: { id: companyId, name, websiteUrl },
        update: { name, websiteUrl },
      });
      await tx.jobSource.upsert({
        where: { platform_boardKey_region: identity },
        create: { ...identity, companyId: company.id },
        update: {}, // Preserva enabled e qualquer decisão anterior do operador.
      });
    }
  });
}
