-- Pocket Sera production schema, derived from Drizzle migrations 0000 through 0005.
--
-- Run this ONCE in the Neon SQL Editor against a new, empty Pocket Sera database.
-- Do not run it against a database where any Pocket Sera tables, types, or Drizzle
-- migration records already exist. Take a Neon branch or backup first.
--
-- This script creates the Drizzle migration ledger at the end, so subsequent
-- Drizzle migrations recognize these six source migrations as already applied.

BEGIN;

-- 0000_groovy_fallen_one.sql
CREATE TYPE "public"."user_role" AS ENUM ('user', 'admin');
CREATE TYPE "public"."mini_app_status" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "public"."mini_apps" (
  "id" serial PRIMARY KEY NOT NULL,
  "submitted_by_user_id" integer NOT NULL,
  "name" varchar(80) NOT NULL,
  "description" text NOT NULL,
  "logo_url" varchar(2048) NOT NULL,
  "launch_url" varchar(2048) NOT NULL,
  "manifest_url" varchar(2048) NOT NULL,
  "developer_identity" varchar(120) NOT NULL,
  "category" varchar(32) NOT NULL,
  "version" varchar(48) NOT NULL,
  "permissions" jsonb NOT NULL,
  "supported_currencies" jsonb NOT NULL,
  "status" "public"."mini_app_status" DEFAULT 'pending' NOT NULL,
  "review_note" text,
  "reviewed_by_user_id" integer,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."users" (
  "id" serial PRIMARY KEY NOT NULL,
  "open_id" varchar(64) NOT NULL,
  "name" text,
  "email" varchar(320),
  "login_method" varchar(64),
  "role" "public"."user_role" DEFAULT 'user' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_open_id_unique" UNIQUE ("open_id")
);

-- 0001_black_wallow.sql
ALTER TABLE "public"."users" ADD COLUMN "privy_did" varchar(128);
ALTER TABLE "public"."users" ADD COLUMN "username" varchar(32);
ALTER TABLE "public"."users" ADD COLUMN "embedded_wallet_address" varchar(64);
ALTER TABLE "public"."users" ADD COLUMN "avatar_url" varchar(2048);
ALTER TABLE "public"."users" ADD COLUMN "preferred_theme" varchar(16) DEFAULT 'system' NOT NULL;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_privy_did_unique" UNIQUE ("privy_did");
ALTER TABLE "public"."users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");

-- 0002_messy_charles_xavier.sql
CREATE TABLE "public"."user_mini_app_states" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "mini_app_id" integer NOT NULL,
  "is_favorite" integer DEFAULT 0 NOT NULL,
  "visit_count" integer DEFAULT 0 NOT NULL,
  "last_visited_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 0003_cute_shiva.sql
ALTER TABLE "public"."user_mini_app_states"
  ADD CONSTRAINT "user_mini_app_states_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."user_mini_app_states"
  ADD CONSTRAINT "user_mini_app_states_mini_app_id_mini_apps_id_fk"
  FOREIGN KEY ("mini_app_id") REFERENCES "public"."mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE UNIQUE INDEX "user_mini_app_states_user_app_unique"
  ON "public"."user_mini_app_states" USING btree ("user_id", "mini_app_id");

-- 0004_dear_alice.sql
ALTER TABLE "public"."users" ADD COLUMN "country_code" varchar(2) DEFAULT 'US' NOT NULL;
ALTER TABLE "public"."users" ADD COLUMN "preferred_currency" varchar(3) DEFAULT 'USD' NOT NULL;
ALTER TABLE "public"."users" ADD COLUMN "preferred_language" varchar(12) DEFAULT 'en' NOT NULL;
ALTER TABLE "public"."users" ADD COLUMN "device_approval" varchar(16) DEFAULT 'passkey' NOT NULL;

-- 0005_outstanding_skin.sql
CREATE TABLE "public"."sera_api_credentials" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "owner_address" varchar(42) NOT NULL,
  "api_key" varchar(128) NOT NULL,
  "encrypted_api_secret" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_verified_at" timestamp with time zone,
  "revoked_at" timestamp with time zone
);
ALTER TABLE "public"."sera_api_credentials"
  ADD CONSTRAINT "sera_api_credentials_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE NO ACTION;
CREATE UNIQUE INDEX "sera_api_credentials_user_owner_unique"
  ON "public"."sera_api_credentials" USING btree ("user_id", "owner_address");
CREATE UNIQUE INDEX "sera_api_credentials_api_key_unique"
  ON "public"."sera_api_credentials" USING btree ("api_key");

-- Keep Drizzle aware that the equivalent source migrations have been applied.
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  "id" serial PRIMARY KEY,
  "hash" text NOT NULL,
  "created_at" bigint
);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES
  ('c61a6f9505297f5460de9601513592b56356ff7a6f3b53cb827f8e90b389b063', 1786785571191),
  ('42be3c03cfc72100bb7dae4d7cd2960ae87f91fa859d230b55e7a98dea63d606', 1786792294630),
  ('f189ac75db1beb8b654e35a5cc8f963ce25e2fb0e224918f9a46936a0f61f377', 1786792730422),
  ('1c84a6099655df855da5f57ad77160bba03bfb0cfb3ab1028905b12aee10aaff', 1786793200521),
  ('c2d7382e85b65df8e71e69f0c5bafaf5305e0304d5ab86a672d6a4cb764c66e8', 1786798649831),
  ('e0aa86156e7a47ddcac8182d0c5497c179ded3aae870515c6e58758a5484ec2e', 1786958183209);

COMMIT;
