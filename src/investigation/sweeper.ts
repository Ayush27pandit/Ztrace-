import { PrismaClient, InvestigationStatus } from "@prisma/client";
import { InvestigationRepository } from "../persistence/repositories/investigation.repository.js";

const ACTIVE_STATUSES: InvestigationStatus[] = ["RUNNING", "COLLECTING_EVIDENCE", "ANALYZING", "VALIDATING"];

export async function sweepStaleLeases(prisma: PrismaClient, now: Date = new Date()): Promise<number> {
  const stale = await prisma.investigation.findMany({
    where: { status: { in: ACTIVE_STATUSES }, leaseExpiresAt: { lt: now } },
  });
  const repo = new InvestigationRepository(prisma);
  for (const inv of stale) {
    await repo.transition(inv.id, "RETRY_WAIT");
    await prisma.investigation.update({
      where: { id: inv.id },
      data: {
        failureCategory: "lease_expired",
        failureSummary: "Lease expired; investigation will be retried",
        leaseOwner: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
      },
    });
    await prisma.auditEvent.create({
      data: {
        investigationId: inv.id,
        actor: "sweeper",
        eventType: "lease_expired",
        metadata: { failureCategory: "lease_expired", previousOwner: inv.leaseOwner },
      },
    });
  }
  return stale.length;
}
