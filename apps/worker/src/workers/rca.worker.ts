import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "../../../../src/persistence/prisma.js";
import { InvestigationRepository } from "../../../../src/persistence/repositories/investigation.repository.js";
import { RCAJobPayload } from "../../../../src/queues/rca.queue.js";

const repo = new InvestigationRepository(prisma);

export async function processRcaJob(payload: RCAJobPayload): Promise<void> {
  const inv = await prisma.investigation.findUnique({ where: { id: payload.investigationId } });
  if (!inv) throw new Error(`investigation ${payload.investigationId} not found`);
  if (inv.status === "RECEIVED") await repo.transition(inv.id, "QUEUED");
  await repo.transition(inv.id, "RUNNING");
  await prisma.investigation.update({
    where: { id: inv.id },
    data: { heartbeatAt: new Date(), startedAt: new Date(), attemptCount: { increment: 1 }, leaseOwner: "worker" },
  });
  await repo.transition(inv.id, "CANCELLED");
  await prisma.investigation.update({
    where: { id: inv.id },
    data: { failureSummary: "synthetic job complete", finishedAt: new Date() },
  });
  await prisma.auditEvent.create({
    data: {
      investigationId: inv.id,
      actor: payload.requestedBy,
      eventType: "job_completed_synthetic",
      metadata: { summary: "synthetic job complete" },
    },
  });
}

export function createRcaWorker(connection: Redis): Worker<RCAJobPayload> {
  return new Worker("rca", async (job) => {
    await processRcaJob(job.data);
  }, { connection });
}
