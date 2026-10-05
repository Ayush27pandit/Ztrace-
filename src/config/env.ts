import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional(),
  UPSTASH_REDIS_HOST: z.string().optional(),
  UPSTASH_REDIS_PORT: z.coerce.number().int().positive().default(6379),
  UPSTASH_REDIS_PASSWORD: z.string().optional(),
  RCA_MODE: z.enum(["shadow", "active"]).default("shadow"),
  RCA_PUBLISH_TO_JIRA: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export const env = envSchema.parse(process.env);
