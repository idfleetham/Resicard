ALTER TABLE "merchants" ADD COLUMN "verifies_residents" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verified_by_merchant_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_verification_code_unique" UNIQUE("verification_code");