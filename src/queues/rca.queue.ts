import { Queue } from "bullmq";
import { Redis } from "ioredis";

export interface RCAJobPayload {
  investigationId: string;
  issueKey: string;
  issueUpdatedAt: string;
  requestedBy: "jira_webhook" | "reconciliation" | "manual";
}

export function createRedis(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}

export function createRcaQueue(connection: Redis): Queue<RCAJobPayload> {
  return new Queue("rca", { connection });
}
