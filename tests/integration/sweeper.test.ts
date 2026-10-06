import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../../src/persistence/prisma.js";
import { acquireLease } from "../../src/investigation/lease.js";
import { sweepStaleLeases } from "../../src/investigation/sweeper.js";
import { InvestigationRepository } from "../../src/persistence/repositories/investigation.repository.js";

const repo = new InvestigationRepository(prisma);

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { investigation: { idempotencyKey: { startsWith: "sweep-" } } } });
  await prisma.investigation.deleteMany({ where: { idempotencyKey: { startsWith: "sweep-" } } });
  await prisma.$disconnect();
});

async function makeRunning(key: string) {
  const inv = await prisma.investigation.create({
    data: { jiraIssueKey: "SWEEP-1", issueUpdatedAt: new Date(), idempotencyKey: key, status: "RUNNING", stage: "running" },
  });
  return inv;
}

describe("sweepStaleLeases", () => {
  it("moves stale RUNNING lease to RETRY_WAIT and writes AuditEvent", async () => {
    const inv = await makeRunning("sweep-stale");
    await prisma.investigation.update({
      where: { id: inv.id },
      data: { leaseOwner: "worker-1", leaseExpiresAt: new Date(Date.now() - 60_000), heartbeatAt: new Date(Date.now() - 60_000) },
    });
    await sweepStaleLeases(prisma, new Date());
    const after = await prisma.investigation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe("RETRY_WAIT");
    expect(after.failureCategory).toBe("lease_expired");
    const events = await prisma.auditEvent.findMany({ where: { investigationId: inv.id, eventType: "lease_expired" } });
    expect(events.length).toBeGreaterThan(0);
  });

  it("leaves fresh lease untouched", async () => {
    const inv = await makeRunning("sweep-fresh");
    await acquireLease(repo, inv.id, "worker-2", 60_000);
    await sweepStaleLeases(prisma, new Date());
    const after = await prisma.investigation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe("RUNNING");
    expect(after.leaseOwner).toBe("worker-2");
  });
});
