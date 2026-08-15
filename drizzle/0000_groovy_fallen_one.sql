CREATE TYPE "public"."mini_app_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."mini_app_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "mini_apps" (
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
	"status" "mini_app_status" DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
