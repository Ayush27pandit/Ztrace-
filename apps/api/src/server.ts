import express, { type Express } from "express";
import pino from "pino";
import { parseEnv } from "../../../src/config/env.js";
import { createHealthRouter } from "./routes/health.js";

export function createApp(): Express {
  const app = express();
  app.use(createHealthRouter());
  return app;
}

import { pathToFileURL } from "node:url";
const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const logger = pino();
  const env = parseEnv(process.env);
  createApp().listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT }, "api listening");
  });
}
