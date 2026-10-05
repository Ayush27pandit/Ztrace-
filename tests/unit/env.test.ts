import { describe, it, expect } from "vitest";
import { parseEnv } from "../../src/config/env.js";

describe("parseEnv", () => {
  it("applies safe defaults", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://x",
      REDIS_URL: "rediss://x",
    } as NodeJS.ProcessEnv);
    expect(env.RCA_MODE).toBe("shadow");
    expect(env.RCA_PUBLISH_TO_JIRA).toBe(false);
  });
  it("rejects missing DATABASE_URL", () => {
    expect(() => parseEnv({} as NodeJS.ProcessEnv)).toThrow();
  });
});
