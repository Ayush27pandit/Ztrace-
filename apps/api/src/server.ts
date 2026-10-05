import Fastify from "fastify";
import { parseEnv } from "../../../src/config/env.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

const start = async (): Promise<void> => {
  const env = parseEnv(process.env);
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
};

void start();
