import { parseEnv } from "../../../src/config/env.js";
import { createRedis } from "../../../src/queues/rca.queue.js";
import { createRcaWorker } from "./workers/rca.worker.js";

const main = (): void => {
  const env = parseEnv(process.env);
  const connection = createRedis(env.REDIS_URL);
  const worker = createRcaWorker(connection);
  worker.on("completed", (job) => console.log(`job ${job.id} completed`));
  worker.on("failed", (job, err) => console.error(`job ${job?.id} failed: ${err.message}`));
  console.log(`ztrace worker starting (node_env=${env.NODE_ENV})`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`received ${signal}, shutting down`);
    await worker.close();
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
};

main();
