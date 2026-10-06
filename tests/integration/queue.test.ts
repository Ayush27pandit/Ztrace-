import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../../src/persistence/prisma.js";
import { InvestigationRepository } from "../../src/persistence/repositories/investigation.repository.js";
import { createRedis, createRcaQueue } from "../../src/queues/rca.queue.js";
import { createRcaWorker } from "../../apps/worker/src/workers/rca.worker.js";

const repo = new InvestigationRepository(prisma);

async function waitFor(cond: () => Promise<boolean>, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("timeout waiting for condition");
}

describe("rca queue/worker", () => {
  it("processes a synthetic job with durable DB transitions", async () => {
    const redis = createRedis(process.env.REDIS_URL!);
    const workerConn = createRedis(process.env.REDIS_URL!);
    const queue = createRcaQueue(redis);
    const worker = createRcaWorker(workerConn);

    const key = `queue-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inv = await repo.createOrGet({
      jiraIssueKey: "Q-1",
      issueUpdatedAt: new Date(),
      idempotencyKey: key,
      requestedBy: "manual",
    });

    await queue.add(
      "rca-job",
      {
        investigationId: inv.id,
        issueKey: "Q-1",
        issueUpdatedAt: inv.issueUpdatedAt.toISOString(),
        requestedBy: "manual",
      },
      { jobId: key },
    );

    await waitFor(async () => {
      const cur = await prisma.investigation.findUnique({ where: { id: inv.id } });
      return cur?.status === "CANCELLED";
    });

    const final = await prisma.investigation.findUnique({
      where: { id: inv.id },
      include: { auditEvents: { orderBy: { createdAt: "asc" } } },
    });
    expect(final?.status).toBe("CANCELLED");
    expect(final?.failureSummary).toBe("synthetic job complete");
    expect(final?.heartbeatAt).not.toBeNull();
    expect(final?.attemptCount).toBe(1);

    const transitions = final!.auditEvents
      .filter((e) => e.eventType === "status_transition")
      .map((e) => (e.metadata as { from: string; to: string }));
    expect(transitions).toContainEqual({ from: "RECEIVED", to: "QUEUED" });
    expect(transitions).toContainEqual({ from: "QUEUED", to: "RUNNING" });
    expect(transitions).toContainEqual({ from: "RUNNING", to: "CANCELLED" });
    expect(final!.auditEvents.some((e) => e.eventType === "created")).toBe(true);

    await worker.close();
    await queue.close();
    redis.disconnect();
    workerConn.disconnect();
  }, 20000);

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { investigation: { idempotencyKey: { startsWith: "queue-test-" } } } });
    await prisma.investigation.deleteMany({ where: { idempotencyKey: { startsWith: "queue-test-" } } });
    await prisma.$disconnect();
  });
});
