import { PrivyClient } from "@privy-io/node";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { readPrivyConfiguration } from "./privyConfig";

type PrivyAccessTokenPayload = { user_id: string };
type RequestWithAuthorization = { headers: { authorization?: string | string[] | undefined } };

let privyClient: PrivyClient | null = null;

export function extractBearerAccessToken(authorization: string | string[] | undefined) {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export function toPrivyIdentity(payload: PrivyAccessTokenPayload) {
  return {
    openId: payload.user_id,
    privyDid: payload.user_id,
    loginMethod: "privy",
  } as const;
}

function getPrivyClient() {
  const configuration = readPrivyConfiguration();
  if (!configuration.isServerConfigured) return null;
  if (!privyClient) privyClient = new PrivyClient(configuration.server);
  return privyClient;
}

export async function authenticatePrivyRequest(request: RequestWithAuthorization): Promise<User | null> {
  const token = extractBearerAccessToken(request.headers.authorization);
  const client = getPrivyClient();
  if (!token || !client) return null;

  try {
    const payload = await client.utils().auth().verifyAccessToken(token);
    const identity = toPrivyIdentity(payload);
    const existingUser = await db.getUserByPrivyDid(identity.privyDid);
    if (existingUser) {
      await db.upsertUser({ ...identity, lastSignedIn: new Date() });
      return (await db.getUserByPrivyDid(identity.privyDid)) ?? existingUser;
    }

    await db.upsertUser({ ...identity, lastSignedIn: new Date() });
    return (await db.getUserByPrivyDid(identity.privyDid)) ?? null;
  } catch (error) {
    console.warn("[Privy] Access token verification failed", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}
