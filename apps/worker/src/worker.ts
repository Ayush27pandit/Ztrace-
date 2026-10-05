import { env } from "../../../src/config/env.js";

const main = (): void => {
  console.log(`ztrace worker starting (node_env=${env.NODE_ENV})`);
};

main();
