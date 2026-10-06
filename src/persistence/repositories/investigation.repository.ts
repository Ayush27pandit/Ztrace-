import { PrismaClient, Investigation, InvestigationStatus } from "@prisma/client";
import { assertTransition } from "../../investigation/state-machine.js";

export interface CreateInvestigationInput {
  jiraIssueKey: string;
  issueUpdatedAt: Date;
  idempotencyKey: string;
  requestedBy: string;
}

export class InvestigationRepository {
  constructor(readonly prisma: PrismaClient) {}

  async createOrGet(input: CreateInvestigationInput): Promise<Investigation> {
    try {
      const created = await this.prisma.investigation.create({
        data: {
          jiraIssueKey: input.jiraIssueKey,
          issueUpdatedAt: input.issueUpdatedAt,
          idempotencyKey: input.idempotencyKey,
        },
      });
      await this.prisma.auditEvent.create({
        data: {
          investigationId: created.id,
          actor: input.requestedBy,
          eventType: "created",
          metadata: { jiraIssueKey: input.jiraIssueKey },
        },
      });
      return created;
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
        const existing = await this.prisma.investigation.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async transition(id: string, to: InvestigationStatus): Promise<Investigation> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.investigation.findUniqueOrThrow({ where: { id } });
      assertTransition(current.status, to);
      const updated = await tx.investigation.update({
        where: { id },
        data: { status: to, stage: to.toLowerCase() },
      });
      await tx.auditEvent.create({
        data: {
          investigationId: id,
          actor: "system",
          eventType: "status_transition",
          metadata: { from: current.status, to },
        },
      });
      return updated;
    });
  }
}
