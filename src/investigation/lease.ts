import { InvestigationRepository } from "../persistence/repositories/investigation.repository.js";

export async function acquireLease(repo: InvestigationRepository, id: string, owner: string, ttlMs: number) {
  const now = new Date();
  return repo.prisma.investigation.update({
    where: { id },
    data: {
      leaseOwner: owner,
      leaseExpiresAt: new Date(now.getTime() + ttlMs),
      heartbeatAt: now,
    },
  });
}
