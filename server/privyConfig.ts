type Environment = Record<string, string | undefined>;

type BrowserPrivyConfiguration = {
  appId: string;
};

type ServerPrivyConfiguration = {
  appId: string;
  appSecret: string;
};

export type PrivyConfiguration = {
  client: BrowserPrivyConfiguration;
  server: ServerPrivyConfiguration;
  isServerConfigured: boolean;
  missingServerVariables: string[];
};

function getMissingServerVariables(configuration: ServerPrivyConfiguration) {
  const missing: string[] = [];
  if (!configuration.appId) missing.push("PRIVY_APP_ID or VITE_PRIVY_APP_ID");
  if (!configuration.appSecret) missing.push("PRIVY_APP_SECRET");
  return missing;
}

export function readPrivyConfiguration(environment: Environment = process.env): PrivyConfiguration {
  const client = { appId: environment.VITE_PRIVY_APP_ID?.trim() ?? "" };
  const server = {
    appId: environment.PRIVY_APP_ID?.trim() || client.appId,
    appSecret: environment.PRIVY_APP_SECRET?.trim() ?? "",
  };
  const missingServerVariables = getMissingServerVariables(server);

  return {
    client,
    server,
    isServerConfigured: missingServerVariables.length === 0,
    missingServerVariables,
  };
}
