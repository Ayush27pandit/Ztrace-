import { parseEnv } from "../../../src/config/env.js";
import { createRedis } from "../../../src/queues/rca.queue.js";
import { createRcaWorker } from "./workers/rca.worker.js";

const main = (): void => {
  const env = parseEnv(process.env);
  const worker = createRcaWorker(createRedis(env.REDIS_URL));
  worker.on("completed", (job) => console.log(`job ${job.id} completed`));
  worker.on("failed", (job, err) => console.error(`job ${job?.id} failed: ${err.message}`));
  console.log(`ztrace worker starting (node_env=${env.NODE_ENV})`);
};

main();
