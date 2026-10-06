import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { prisma } from "../../../../src/persistence/prisma.js";
import { createRedis } from "../../../../src/queues/rca.queue.js";
import { parseEnv } from "../../../../src/config/env.js";

export interface HealthDeps {
  prisma: Pick<PrismaClient, "$queryRaw">;
  redis: Pick<Redis, "ping">;
}

let sharedRedis: Redis | undefined;

function defaultRedis(): Redis {
  if (!sharedRedis) {
    sharedRedis = createRedis(parseEnv(process.env).REDIS_URL);
  }
  return sharedRedis;
}

export function createHealthRouter(deps?: HealthDeps): Router {
  const router = Router();
  const getDeps = (): HealthDeps => deps ?? { prisma, redis: defaultRedis() };

  router.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/health/ready", async (_req, res) => {
    try {
      const { prisma: p, redis: r } = getDeps();
      await p.$queryRaw`SELECT 1`;
      await r.ping();
      res.status(200).json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "error" });
    }
  });

  return router;
}
