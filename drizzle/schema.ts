import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const miniAppStatus = pgEnum("mini_app_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MiniApp = typeof miniApps.$inferSelect;
export type InsertMiniApp = typeof miniApps.$inferInsert;
