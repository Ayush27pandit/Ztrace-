import express from "express";
import pino from "pino";
import { parseEnv } from "../../../src/config/env.js";

const app = express();
const logger = pino();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const start = (): void => {
  const env = parseEnv(process.env);
  app.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT }, "api listening");
  });
};

start();
