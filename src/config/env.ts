import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  RCA_MODE: z.enum(["shadow", "active"]).default("shadow"),
  RCA_PUBLISH_TO_JIRA: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  UPSTASH_REDIS_HOST: z.string().optional(),
  UPSTASH_REDIS_PORT: z.coerce.number().int().positive().default(6379),
  UPSTASH_REDIS_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof schema>;
export function parseEnv(e: NodeJS.ProcessEnv): Env {
  return schema.parse(e);
}
