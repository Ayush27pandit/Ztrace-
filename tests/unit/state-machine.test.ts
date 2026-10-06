import { describe, it, expect } from "vitest";
import { canTransition, assertTransition } from "../../src/investigation/state-machine.js";

describe("state machine", () => {
  it("allows RECEIVED -> QUEUED", () => {
    expect(canTransition("RECEIVED", "QUEUED")).toBe(true);
  });
  it("rejects RECEIVED -> PUBLISHED", () => {
    expect(() => assertTransition("RECEIVED", "PUBLISHED")).toThrow();
  });
  it("allows retry from FAILED to QUEUED", () => {
    expect(canTransition("FAILED", "QUEUED")).toBe(true);
  });
});
