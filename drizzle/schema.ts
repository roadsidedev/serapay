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
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

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
export type MiniApp = typeof miniApps.$inferSelect;
export type InsertMiniApp = typeof miniApps.$inferInsert;
export type UserMiniAppState = typeof userMiniAppStates.$inferSelect;
