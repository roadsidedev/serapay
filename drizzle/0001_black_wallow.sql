ALTER TABLE "users" ADD COLUMN "privy_did" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "embedded_wallet_address" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_theme" varchar(16) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_privy_did_unique" UNIQUE("privy_did");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
