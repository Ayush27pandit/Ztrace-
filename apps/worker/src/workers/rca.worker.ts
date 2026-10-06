import os from "node:os";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "../../../../src/persistence/prisma.js";
import { InvestigationRepository } from "../../../../src/persistence/repositories/investigation.repository.js";
import { acquireLease } from "../../../../src/investigation/lease.js";
import { RCAJobPayload } from "../../../../src/queues/rca.queue.js";

const repo = new InvestigationRepository(prisma);

export const RCA_LEASE_TTL_MS = 30_000;

const TERMINAL_STATUSES = new Set([
  "PUBLISHED",
  "INSUFFICIENT_EVIDENCE",
  "REVIEW_REQUIRED",
  "FAILED",
  "CANCELLED",
]);

// Safe summary: never include error messages or stack traces (may contain secrets).
const SAFE_FAILURE_SUMMARY = "Job failed during processing; see worker logs for details";

function workerOwner(): string {
  return `${os.hostname()}-${process.pid}`;
}

export async function processRcaJob(payload: RCAJobPayload): Promise<void> {
  const inv = await prisma.investigation.findUnique({ where: { id: payload.investigationId } });
  if (!inv) throw new Error(`investigation ${payload.investigationId} not found`);
  // Redelivery guard: BullMQ redelivers at-least-once; never attempt an illegal
  // transition out of a terminal state.
  if (TERMINAL_STATUSES.has(inv.status)) return;
  try {
    if (inv.status === "RECEIVED") await repo.transition(inv.id, "QUEUED");
    await repo.transition(inv.id, "RUNNING");
    // Acquire a TTL lease so the sweeper can recover a crashed worker. This also
    // writes heartbeatAt; refreshing the lease IS the heartbeat write.
    await acquireLease(repo, inv.id, workerOwner(), RCA_LEASE_TTL_MS);
    await prisma.investigation.update({
      where: { id: inv.id },
      data: { startedAt: new Date(), attemptCount: { increment: 1 } },
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
  } catch (err) {
    // Failure path: leave durable FAILED evidence, then rethrow for BullMQ.
    const current = await prisma.investigation.findUnique({ where: { id: inv.id } });
    if (current && !TERMINAL_STATUSES.has(current.status)) {
      try {
        await repo.transition(inv.id, "FAILED");
      } catch {
        // Race with another writer (e.g. sweeper moved it); fall through to
        // best-effort summary + audit below.
      }
      await prisma.investigation.update({
        where: { id: inv.id },
        data: { failureSummary: SAFE_FAILURE_SUMMARY, finishedAt: new Date() },
      });
      await prisma.auditEvent.create({
        data: {
          investigationId: inv.id,
          actor: payload.requestedBy,
          eventType: "job_failed",
          metadata: { failureCategory: "job_failed" },
        },
      });
    } else {
      await prisma.auditEvent.create({
        data: {
          investigationId: inv.id,
          actor: payload.requestedBy,
          eventType: "job_failed",
          metadata: { failureCategory: "job_failed" },
        },
      });
    }
    throw err;
  }
}

export function createRcaWorker(connection: Redis): Worker<RCAJobPayload> {
  return new Worker("rca", async (job) => {
    await processRcaJob(job.data);
  }, { connection });
}
