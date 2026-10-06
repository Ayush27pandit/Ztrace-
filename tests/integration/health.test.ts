import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../apps/api/src/server.js";
import { createHealthRouter } from "../../apps/api/src/routes/health.js";
import express from "express";
import { prisma } from "../../src/persistence/prisma.js";

describe("health endpoints", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /health/live returns 200 {status:'ok'}", async () => {
    const res = await request(createApp()).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /health/ready returns 200 when DB and Redis are reachable", async () => {
    const res = await request(createApp()).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /health/ready returns generic 503 with no dependency error details on failure", async () => {
    const brokenPrisma = {
      $queryRaw: async () => {
        throw new Error("secret db connection string leak");
      },
    };
    const brokenRedis = {
      ping: async () => {
        throw new Error("redis internal details");
      },
    };
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use(createHealthRouter({ prisma: brokenPrisma as any, redis: brokenRedis as any }));
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain("secret db connection string leak");
    expect(JSON.stringify(res.body)).not.toContain("redis internal details");
  });
});
