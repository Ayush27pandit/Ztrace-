import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../../src/persistence/prisma.js";
import { InvestigationRepository } from "../../src/persistence/repositories/investigation.repository.js";

const repo = new InvestigationRepository(prisma);
afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { investigation: { idempotencyKey: { startsWith: "k" } } } });
  await prisma.investigation.deleteMany({ where: { idempotencyKey: { startsWith: "k" } } });
  await prisma.$disconnect();
});

describe("InvestigationRepository", () => {
  it("is idempotent on idempotencyKey", async () => {
    const a = await repo.createOrGet({ jiraIssueKey: "ABC-1", issueUpdatedAt: new Date(), idempotencyKey: "k1", requestedBy: "jira_webhook" });
    const b = await repo.createOrGet({ jiraIssueKey: "ABC-1", issueUpdatedAt: new Date(), idempotencyKey: "k1", requestedBy: "jira_webhook" });
    expect(a.id).toBe(b.id);
  });
  it("rejects invalid transition", async () => {
    const a = await repo.createOrGet({ jiraIssueKey: "ABC-2", issueUpdatedAt: new Date(), idempotencyKey: "k2", requestedBy: "manual" });
    await expect(repo.transition(a.id, "PUBLISHED")).rejects.toThrow();
  });
});
