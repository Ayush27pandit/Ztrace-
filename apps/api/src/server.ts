import Fastify from "fastify";
import { env } from "../../../src/config/env.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

const start = async (): Promise<void> => {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
};

void start();
