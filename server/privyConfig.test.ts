import { describe, expect, it } from "vitest";
import { readPrivyConfiguration } from "./privyConfig";

describe("readPrivyConfiguration", () => {
  it("uses environment variables without exposing the server secret to browser-safe configuration", () => {
    const configuration = readPrivyConfiguration({
      VITE_PRIVY_APP_ID: "client-app-id",
      PRIVY_APP_ID: "server-app-id",
      PRIVY_APP_SECRET: "server-secret",
    });

    expect(configuration.client.appId).toBe("client-app-id");
    expect(configuration.server.appId).toBe("server-app-id");
    expect(configuration.server.appSecret).toBe("server-secret");
    expect(configuration.client).not.toHaveProperty("appSecret");
    expect(configuration.isServerConfigured).toBe(true);
  });

  it("falls back to the public app ID for server initialization and reports incomplete configuration safely", () => {
    const configuration = readPrivyConfiguration({ VITE_PRIVY_APP_ID: "shared-app-id" });

    expect(configuration.server.appId).toBe("shared-app-id");
    expect(configuration.isServerConfigured).toBe(false);
    expect(configuration.missingServerVariables).toEqual(["PRIVY_APP_SECRET"]);
  });
});
