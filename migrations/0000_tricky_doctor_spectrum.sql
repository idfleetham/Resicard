CREATE TABLE "favourites" (
	"user_id" integer NOT NULL,
	"merchant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "favourites_user_id_merchant_id_pk" PRIMARY KEY("user_id","merchant_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"points" integer DEFAULT 0,
	"stamps" integer DEFAULT 0,
	"tier_id" uuid,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"model" text DEFAULT 'points',
	"points_per_currency" integer DEFAULT 10,
	"points_per_redemption" integer DEFAULT 10,
	"min_basket_earn" numeric(10, 2) DEFAULT '0.00',
	"earn_cooldown_minutes" integer DEFAULT 30,
	"daily_earn_cap" integer DEFAULT 3,
	"stacking_allowed" boolean DEFAULT false,
	"expiry_days" integer,
	"tier_window_days" integer DEFAULT 365,
	"card_theme" text DEFAULT 'sea',
	"card_pattern" text DEFAULT 'plain',
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "loyalty_programs_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" integer NOT NULL,
	"name" text NOT NULL,
	"cost_points" integer,
	"cost_stamps" integer,
	"tier_id" uuid,
	"claim_rule" text DEFAULT 'unlimited',
	"terms" text,
	"active" boolean DEFAULT true,
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" integer NOT NULL,
	"name" text NOT NULL,
	"threshold_points" integer NOT NULL,
	"discount_percent" integer,
	"points_multiplier" numeric(3, 2) DEFAULT '1.00',
	"color" text DEFAULT '#f97316',
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"email" text,
	"phone" text,
	"address" text,
	"logo_url" text,
	"business_hours" text,
	"reservation_provider" text,
	"reservation_url" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"scan_code" text NOT NULL,
	"status" text DEFAULT 'pending',
	"approved_at" timestamp,
	"approved_by" integer,
	"plan_status" text DEFAULT 'free',
	"plan_started_at" timestamp DEFAULT now(),
	"plan_renews_at" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "merchants_scan_code_unique" UNIQUE("scan_code")
);
--> statement-breakpoint
CREATE TABLE "offer_price_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"changed_by" integer,
	"field" text NOT NULL,
	"old_value" numeric(10, 2),
	"new_value" numeric(10, 2),
	"direction" text NOT NULL,
	"inflates_saving" boolean DEFAULT false NOT NULL,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"short_promo" text,
	"type" text DEFAULT 'percentage_discount',
	"percent_off" integer,
	"fixed_price" numeric(10, 2),
	"original_value" numeric(10, 2),
	"category" text,
	"typical_spend" numeric(10, 2),
	"item_value" numeric(10, 2),
	"tags" jsonb,
	"eligible_tiers" jsonb,
	"min_basket" numeric(10, 2),
	"max_discount" numeric(10, 2),
	"stackable" boolean DEFAULT false,
	"new_customer_only" boolean DEFAULT false,
	"valid_from" date,
	"valid_to" date,
	"days_of_week" jsonb,
	"time_slots" jsonb,
	"blackout_dates" jsonb,
	"max_per_day" integer,
	"max_per_week" integer,
	"max_lifetime" integer,
	"global_usage_limit" integer,
	"usage_count" integer DEFAULT 0,
	"terms" text,
	"dine_in_only" boolean DEFAULT false,
	"excludes_alcohol" boolean DEFAULT false,
	"image_url" text,
	"menu_pdf" text,
	"priority" text DEFAULT 'standard',
	"active" boolean DEFAULT true,
	"archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"request_ip" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "postcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"code_hash" text NOT NULL,
	"address_snapshot" text NOT NULL,
	"status" text DEFAULT 'requested',
	"requested_at" timestamp DEFAULT now(),
	"posted_at" timestamp,
	"posted_by" integer,
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"basket_amount" numeric(10, 2),
	"points_awarded" integer DEFAULT 0,
	"saved_amount" numeric(10, 2),
	"saved_estimated" boolean DEFAULT true,
	"redeemed_at" timestamp DEFAULT now(),
	CONSTRAINT "redemptions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reward_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reward_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"points_spent" integer DEFAULT 0,
	"stamps_spent" integer DEFAULT 0,
	"claimed_at" timestamp DEFAULT now(),
	CONSTRAINT "reward_claims_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_name" text,
	"plan" text,
	"action" text NOT NULL,
	"amount_gbp" numeric(10, 2) DEFAULT '0',
	"period_start" timestamp,
	"period_end" timestamp,
	"source" text DEFAULT 'dev',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text,
	"surname" text,
	"role" text NOT NULL,
	"postcode" text,
	"profile_photo" text,
	"age_band" text,
	"sex" text,
	"address_line1" text,
	"address_line2" text,
	"town" text DEFAULT 'St Andrews',
	"is_residency_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verified_by" integer,
	"verification_method" text,
	"membership_plan" text DEFAULT 'individual',
	"membership_status" text DEFAULT 'inactive',
	"membership_expiry" timestamp,
	"membership_renews" boolean DEFAULT true,
	"household_code" text,
	"household_primary_id" integer,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"merchant_id" uuid,
	"staff_pin" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_household_code_unique" UNIQUE("household_code")
);
--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_balances" ADD CONSTRAINT "loyalty_balances_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_balances" ADD CONSTRAINT "loyalty_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_balances" ADD CONSTRAINT "loyalty_balances_tier_id_loyalty_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_events" ADD CONSTRAINT "loyalty_events_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_tier_id_loyalty_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_changes" ADD CONSTRAINT "offer_price_changes_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_changes" ADD CONSTRAINT "offer_price_changes_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_changes" ADD CONSTRAINT "offer_price_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postcards" ADD CONSTRAINT "postcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_reward_id_loyalty_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."loyalty_rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;