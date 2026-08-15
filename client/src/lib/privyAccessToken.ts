type AccessTokenProvider = () => Promise<string | null>;

let accessTokenProvider: AccessTokenProvider | null = null;

export function setPrivyAccessTokenProvider(provider: AccessTokenProvider | null) {
  accessTokenProvider = provider;
}

export async function getPrivyAccessToken() {
  return accessTokenProvider ? accessTokenProvider() : null;
}
