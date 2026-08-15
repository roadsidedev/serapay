ALTER TABLE "users" ADD COLUMN "country_code" varchar(2) DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_language" varchar(12) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_approval" varchar(16) DEFAULT 'passkey' NOT NULL;