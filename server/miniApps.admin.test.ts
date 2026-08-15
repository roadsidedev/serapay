import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createStandardUserContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "standard-user",
      email: "user@example.com",
      name: "Standard User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("mini-app owner controls", () => {
  it("rejects a standard user before the review queue is queried", async () => {
    const caller = appRouter.createCaller(createStandardUserContext());
    await expect(caller.miniApps.listForReview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
