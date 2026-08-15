import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { InsertUser, users } from "../drizzle/schema";
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
  const textFields = ["privyDid", "username", "embeddedWalletAddress", "avatarUrl", "preferredTheme", "name", "email", "loginMethod"] as const;

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

export async function updateUserProfile(userId: number, profile: Pick<InsertUser, "username" | "name" | "embeddedWalletAddress" | "avatarUrl" | "preferredTheme">) {
  const db = await getDb();
  if (!db) throw new Error("Profile storage is unavailable. Configure DATABASE_URL with a Neon Postgres connection string.");

  const result = await db
    .update(users)
    .set({ ...profile, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return result[0];
}
