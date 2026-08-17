CREATE TABLE "sera_api_credentials" (
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
--> statement-breakpoint
ALTER TABLE "sera_api_credentials" ADD CONSTRAINT "sera_api_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sera_api_credentials_user_owner_unique" ON "sera_api_credentials" USING btree ("user_id","owner_address");--> statement-breakpoint
CREATE UNIQUE INDEX "sera_api_credentials_api_key_unique" ON "sera_api_credentials" USING btree ("api_key");