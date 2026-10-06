import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../../src/persistence/prisma.js";
import { InvestigationRepository } from "../../src/persistence/repositories/investigation.repository.js";
import { processRcaJob } from "../../apps/worker/src/workers/rca.worker.js";

const repo = new InvestigationRepository(prisma);

function makeKey(prefix = "queue-test-worker"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { investigation: { idempotencyKey: { startsWith: "queue-test-worker" } } } });
  await prisma.investigation.deleteMany({ where: { idempotencyKey: { startsWith: "queue-test-worker" } } });
  await prisma.$disconnect();
});

describe("processRcaJob hardening", () => {
  it("sets leaseExpiresAt in the future after a synthetic run", async () => {
    const key = makeKey();
    const inv = await repo.createOrGet({
      jiraIssueKey: "W-LEASE",
      issueUpdatedAt: new Date(),
      idempotencyKey: key,
      requestedBy: "manual",
    });
    await processRcaJob({
      investigationId: inv.id,
      issueKey: "W-LEASE",
      issueUpdatedAt: inv.issueUpdatedAt.toISOString(),
      requestedBy: "manual",
    });
    const after = await prisma.investigation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.leaseExpiresAt).not.toBeNull();
    expect(after.leaseExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(after.leaseOwner).not.toBeNull();
    expect(after.heartbeatAt).not.toBeNull();
  });

  it("transitions to FAILED with safe summary and audit on crash, then rethrows", async () => {
    const key = makeKey();
    const inv = await repo.createOrGet({
      jiraIssueKey: "W-CRASH",
      issueUpdatedAt: new Date(),
      idempotencyKey: key,
      requestedBy: "manual",
    });
    // Move to COLLECTING_EVIDENCE so the synthetic RUNNING->CANCELLED path throws
    // an illegal transition inside processRcaJob.
    await repo.transition(inv.id, "QUEUED");
    await repo.transition(inv.id, "RUNNING");
    await repo.transition(inv.id, "COLLECTING_EVIDENCE");

    await expect(
      processRcaJob({
        investigationId: inv.id,
        issueKey: "W-CRASH",
        issueUpdatedAt: inv.issueUpdatedAt.toISOString(),
        requestedBy: "manual",
      }),
    ).rejects.toThrow();

    const after = await prisma.investigation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe("FAILED");
    expect(after.failureSummary).toBeTruthy();
    // Safe summary: no stack traces.
    expect(after.failureSummary).not.toMatch(/\n\s*at\s/);
    const events = await prisma.auditEvent.findMany({ where: { investigationId: inv.id } });
    const failedTransition = events.filter(
      (e) => e.eventType === "status_transition" && (e.metadata as { to?: string })?.to === "FAILED",
    );
    const jobFailed = events.filter((e) => e.eventType === "job_failed");
    expect(failedTransition.length + jobFailed.length).toBeGreaterThan(0);
  });

  it("skips terminal investigations without throwing (redelivery guard)", async () => {
    const key = makeKey();
    const inv = await repo.createOrGet({
      jiraIssueKey: "W-TERM",
      issueUpdatedAt: new Date(),
      idempotencyKey: key,
      requestedBy: "manual",
    });
    await repo.transition(inv.id, "CANCELLED");
    await expect(
      processRcaJob({
        investigationId: inv.id,
        issueKey: "W-TERM",
        issueUpdatedAt: inv.issueUpdatedAt.toISOString(),
        requestedBy: "manual",
      }),
    ).resolves.toBeUndefined();
    const after = await prisma.investigation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe("CANCELLED");
  });
});
