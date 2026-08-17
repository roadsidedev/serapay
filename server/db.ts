import { neon } from "@neondatabase/serverless";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { InsertUser, seraApiCredentials, users } from "../drizzle/schema";
import { decryptSeraApiSecret, encryptSeraApiSecret } from "./seraCredentialCrypto";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

function canUsePostgres(connectionString: string | undefined) {
  return Boolean(connectionString?.startsWith("postgresql://") || connectionString?.startsWith("postgres://"));
}

export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!database && databaseUrl && canUsePostgres(databaseUrl)) {
    database = drizzle(neon(databaseUrl));
  }

  if (!database && databaseUrl) {
    console.warn("[Database] DATABASE_URL is not a Postgres connection string; configure your Neon URL before using persistence.");
  }

  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["privyDid", "username", "embeddedWalletAddress", "avatarUrl", "preferredTheme", "countryCode", "preferredCurrency", "preferredLanguage", "deviceApproval", "name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      const value = user[field] ?? undefined;
      values[field] = value as never;
      updateSet[field] = value;
    }
  }

  values.role = user.role ?? (user.openId === ENV.ownerOpenId || user.privyDid === ENV.ownerPrivyDid ? "admin" : "user");
  updateSet.role = values.role;
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByPrivyDid(privyDid: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.privyDid, privyDid)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function getSeraCredential(userId: number, ownerAddress: string) {
  const db = await getDb();
  if (!db) throw new Error("Sera credential storage is unavailable. Configure DATABASE_URL with a Neon Postgres connection string.");
  const result = await db.select().from(seraApiCredentials).where(and(
    eq(seraApiCredentials.userId, userId),
    eq(seraApiCredentials.ownerAddress, ownerAddress.toLowerCase()),
    isNull(seraApiCredentials.revokedAt),
  )).limit(1);
  return result[0];
}

export async function saveSeraCredential(input: { userId: number; ownerAddress: string; apiKey: string; apiSecret: string }) {
  const db = await getDb();
  if (!db) throw new Error("Sera credential storage is unavailable. Configure DATABASE_URL with a Neon Postgres connection string.");
  const ownerAddress = input.ownerAddress.toLowerCase();
  const encryptedApiSecret = encryptSeraApiSecret(input.apiSecret);
  const existing = await db.select({ id: seraApiCredentials.id }).from(seraApiCredentials).where(and(
    eq(seraApiCredentials.userId, input.userId),
    eq(seraApiCredentials.ownerAddress, ownerAddress),
  )).limit(1);
  if (existing[0]) {
    const result = await db.update(seraApiCredentials).set({ apiKey: input.apiKey, encryptedApiSecret, revokedAt: null, lastVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(seraApiCredentials.id, existing[0].id)).returning();
    return result[0];
  }
  const result = await db.insert(seraApiCredentials).values({ userId: input.userId, ownerAddress, apiKey: input.apiKey, encryptedApiSecret, lastVerifiedAt: new Date() }).returning();
  return result[0];
}

export async function markSeraCredentialVerified(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Sera credential storage is unavailable. Configure DATABASE_URL with a Neon Postgres connection string.");
  const result = await db.update(seraApiCredentials).set({ lastVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(seraApiCredentials.id, id)).returning();
  return result[0];
}

export async function revokeSeraCredential(userId: number, ownerAddress: string) {
  const db = await getDb();
  if (!db) throw new Error("Sera credential storage is unavailable. Configure DATABASE_URL with a Neon Postgres connection string.");
  const result = await db.update(seraApiCredentials).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(
    eq(seraApiCredentials.userId, userId),
    eq(seraApiCredentials.ownerAddress, ownerAddress.toLowerCase()),
    isNull(seraApiCredentials.revokedAt),
  )).returning();
  return result[0];
}

export function decryptStoredSeraSecret(encryptedApiSecret: string) {
  return decryptSeraApiSecret(encryptedApiSecret);
}

export async function updateUserProfile(userId: number, profile: Pick<InsertUser, "username" | "name" | "embeddedWalletAddress" | "avatarUrl" | "preferredTheme" | "countryCode" | "preferredCurrency" | "preferredLanguage" | "deviceApproval">) {
  const db = await getDb();
  if (!db) throw new Error("Profile storage is unavailable. Configure DATABASE_URL with a Neon Postgres connection string.");

  const result = await db
    .update(users)
    .set({ ...profile, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return result[0];
}
