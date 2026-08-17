import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const miniAppStatus = pgEnum("mini_app_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  privyDid: varchar("privy_did", { length: 128 }).unique(),
  username: varchar("username", { length: 32 }).unique(),
  embeddedWalletAddress: varchar("embedded_wallet_address", { length: 64 }),
  avatarUrl: varchar("avatar_url", { length: 2048 }),
  preferredTheme: varchar("preferred_theme", { length: 16 }).default("system").notNull(),
  countryCode: varchar("country_code", { length: 2 }).default("US").notNull(),
  preferredCurrency: varchar("preferred_currency", { length: 3 }).default("USD").notNull(),
  preferredLanguage: varchar("preferred_language", { length: 12 }).default("en").notNull(),
  deviceApproval: varchar("device_approval", { length: 16 }).default("passkey").notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export const seraApiCredentials = pgTable("sera_api_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerAddress: varchar("owner_address", { length: 42 }).notNull(),
  apiKey: varchar("api_key", { length: 128 }).notNull(),
  encryptedApiSecret: text("encrypted_api_secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, table => [
  uniqueIndex("sera_api_credentials_user_owner_unique").on(table.userId, table.ownerAddress),
  uniqueIndex("sera_api_credentials_api_key_unique").on(table.apiKey),
]);

export const miniApps = pgTable("mini_apps", {
  id: serial("id").primaryKey(),
  submittedByUserId: integer("submitted_by_user_id").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description").notNull(),
  logoUrl: varchar("logo_url", { length: 2048 }).notNull(),
  launchUrl: varchar("launch_url", { length: 2048 }).notNull(),
  manifestUrl: varchar("manifest_url", { length: 2048 }).notNull(),
  developerIdentity: varchar("developer_identity", { length: 120 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  version: varchar("version", { length: 48 }).notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull(),
  supportedCurrencies: jsonb("supported_currencies").$type<string[]>().notNull(),
  status: miniAppStatus("status").default("pending").notNull(),
  reviewNote: text("review_note"),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userMiniAppStates = pgTable("user_mini_app_states", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  miniAppId: integer("mini_app_id").notNull().references(() => miniApps.id, { onDelete: "cascade" }),
  isFavorite: integer("is_favorite").default(0).notNull(),
  visitCount: integer("visit_count").default(0).notNull(),
  lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("user_mini_app_states_user_app_unique").on(table.userId, table.miniAppId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SeraApiCredential = typeof seraApiCredentials.$inferSelect;
export type InsertSeraApiCredential = typeof seraApiCredentials.$inferInsert;
export type MiniApp = typeof miniApps.$inferSelect;
export type InsertMiniApp = typeof miniApps.$inferInsert;
export type UserMiniAppState = typeof userMiniAppStates.$inferSelect;
