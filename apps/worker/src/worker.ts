import { parseEnv } from "../../../src/config/env.js";

const main = (): void => {
  const env = parseEnv(process.env);
  console.log(`ztrace worker starting (node_env=${env.NODE_ENV})`);
};

main();
