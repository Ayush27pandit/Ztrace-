import { PrismaClient, InvestigationStatus } from "@prisma/client";
import { assertTransition } from "./state-machine.js";

const ACTIVE_STATUSES: InvestigationStatus[] = ["RUNNING", "COLLECTING_EVIDENCE", "ANALYZING", "VALIDATING"];

export interface SweepFailure {
  id: string;
  error: unknown;
}

export interface SweepResult {
  swept: number;
  failed: SweepFailure[];
}

export async function sweepStaleLeases(prisma: PrismaClient, now: Date = new Date()): Promise<SweepResult> {
  const stale = await prisma.investigation.findMany({
    where: { status: { in: ACTIVE_STATUSES }, leaseExpiresAt: { lt: now } },
  });
  const result: SweepResult = { swept: 0, failed: [] };
  for (const inv of stale) {
    try {
      let swept = false;
      await prisma.$transaction(async (tx) => {
        const current = await tx.investigation.findUniqueOrThrow({ where: { id: inv.id } });
        if (!current.leaseExpiresAt || current.leaseExpiresAt >= now) return;
        assertTransition(current.status, "RETRY_WAIT");
        const updated = await tx.investigation.updateMany({
          where: { id: inv.id, leaseExpiresAt: { lt: now } },
          data: {
            status: "RETRY_WAIT",
            stage: "retry_wait",
            failureCategory: "lease_expired",
            failureSummary: "Lease expired; investigation will be retried",
            leaseOwner: null,
            leaseExpiresAt: null,
            heartbeatAt: null,
          },
        });
        if (updated.count === 0) return;
        swept = true;
        await tx.auditEvent.create({
          data: {
            investigationId: inv.id,
            actor: "system",
            eventType: "status_transition",
            metadata: { from: current.status, to: "RETRY_WAIT" },
          },
        });
        await tx.auditEvent.create({
          data: {
            investigationId: inv.id,
            actor: "sweeper",
            eventType: "lease_expired",
            metadata: { failureCategory: "lease_expired", previousOwner: inv.leaseOwner },
          },
        });
      });
      if (swept) result.swept += 1;
    } catch (error) {
      result.failed.push({ id: inv.id, error });
      console.error(`sweep failed for investigation ${inv.id}:`, error);
    }
  }
  return result;
}
