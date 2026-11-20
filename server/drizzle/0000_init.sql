CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"type" text,
	"title" text,
	"description" text,
	"member_id" uuid,
	"amount" double precision,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "branch_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"whatsapp_access_token" text,
	"whatsapp_phone_number_id" text,
	"whatsapp_active" boolean DEFAULT false NOT NULL,
	"whatsapp_header_image_url" text,
	"whatsapp_header_image_id" text,
	"whatsapp_reminder_days" integer DEFAULT 1 NOT NULL,
	"whatsapp_send_on_onboarding" boolean DEFAULT true NOT NULL,
	"whatsapp_send_on_renewal" boolean DEFAULT true NOT NULL,
	"whatsapp_send_on_expiry" boolean DEFAULT true NOT NULL,
	"whatsapp_send_on_reminder" boolean DEFAULT true NOT NULL,
	"receipt_logo" text,
	"receipt_signature" text,
	"receipt_footer_note" text DEFAULT 'Thank you for training with us!' NOT NULL,
	"receipt_show_gym_address" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_settings_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id"),
	CONSTRAINT "branch_settings_branch_id_unique" UNIQUE("branch_id")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"owner_name" text,
	"contact_number" text NOT NULL,
	"email" text,
	"logo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"age" integer,
	"birthday" timestamp with time zone,
	"anniversary_date" timestamp with time zone,
	"onboarding_purpose" text,
	"gender" text,
	"profile_picture" text,
	"balance" double precision DEFAULT 0 NOT NULL,
	"is_seeded" boolean DEFAULT false NOT NULL,
	"role" text DEFAULT 'primary' NOT NULL,
	"membership_status" text,
	"active_membership_id" uuid,
	"upcoming_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "membership_members" (
	"membership_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "membership_members_membership_id_member_id_pk" PRIMARY KEY("membership_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "membership_pauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"membership_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"days" integer,
	"reason" text,
	CONSTRAINT "membership_pauses_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"primary_member_id" uuid NOT NULL,
	"package_id" uuid,
	"plan_name" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"total_amount" double precision NOT NULL,
	"total_paused_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "message_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"member_id" uuid,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"template" text,
	"status" text NOT NULL,
	"summary" text,
	"provider_message_id" text,
	"error_code" text,
	"error_message" text,
	"status_updated_at" timestamp with time zone,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_logs_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id"),
	CONSTRAINT "message_logs_provider_message_id_unique" UNIQUE("provider_message_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"plan_name" text NOT NULL,
	"duration_in_days" integer DEFAULT 0 NOT NULL,
	"duration_in_months" integer DEFAULT 0 NOT NULL,
	"price" double precision NOT NULL,
	"is_trial" boolean DEFAULT false NOT NULL,
	"plan_type" text DEFAULT 'indivisual' NOT NULL,
	"members_allowed" integer DEFAULT 1 NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"membership_id" uuid,
	"amount" double precision,
	"method" text,
	"type" text DEFAULT 'membership' NOT NULL,
	"remarks" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"phone_number" text,
	"firebase_uid" text,
	"username" text,
	"password_hash" text,
	"role" text NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expo_push_token" text,
	"push_notifications_enabled" boolean DEFAULT true NOT NULL,
	"push_expiring_today" boolean DEFAULT true NOT NULL,
	"push_expiring_soon" boolean DEFAULT true NOT NULL,
	"push_outstanding_balance" boolean DEFAULT true NOT NULL,
	"push_daily_summary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_settings" ADD CONSTRAINT "branch_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_active_membership_id_memberships_id_fk" FOREIGN KEY ("active_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_upcoming_membership_id_memberships_id_fk" FOREIGN KEY ("upcoming_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_members" ADD CONSTRAINT "membership_members_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_members" ADD CONSTRAINT "membership_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_pauses" ADD CONSTRAINT "membership_pauses_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_primary_member_id_members_id_fk" FOREIGN KEY ("primary_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_branch_date" ON "activities" USING btree ("branch_id","date");--> statement-breakpoint
CREATE INDEX "activities_member" ON "activities" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_branch_phone" ON "members" USING btree ("branch_id","phone_number");--> statement-breakpoint
CREATE INDEX "members_branch_status" ON "members" USING btree ("branch_id","membership_status");--> statement-breakpoint
CREATE INDEX "membership_members_member" ON "membership_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "membership_pauses_membership" ON "membership_pauses" USING btree ("membership_id","started_at");--> statement-breakpoint
CREATE INDEX "memberships_branch_status_end" ON "memberships" USING btree ("branch_id","status","end_date");--> statement-breakpoint
CREATE INDEX "memberships_primary" ON "memberships" USING btree ("primary_member_id");--> statement-breakpoint
CREATE INDEX "message_logs_branch_sent" ON "message_logs" USING btree ("branch_id","sent_at");--> statement-breakpoint
CREATE INDEX "message_logs_member_sent" ON "message_logs" USING btree ("member_id","sent_at");--> statement-breakpoint
CREATE INDEX "packages_branch" ON "packages" USING btree ("branch_id","sort_index");--> statement-breakpoint
CREATE INDEX "payments_branch_paid" ON "payments" USING btree ("branch_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_member" ON "payments" USING btree ("member_id","paid_at");