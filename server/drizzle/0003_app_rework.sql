CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "actor_user_id" uuid;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "timings" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "direction" text DEFAULT 'out' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "sent_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "collected_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "photo" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_id" uuid;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_branch_name" ON "roles" USING btree ("branch_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_branch_key" ON "roles" USING btree ("branch_id","key");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_user_id_users_id_fk" FOREIGN KEY ("collected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_logs_branch_phone" ON "message_logs" USING btree ("branch_id","phone","sent_at");--> statement-breakpoint
CREATE INDEX "message_logs_unread" ON "message_logs" USING btree ("branch_id","direction","seen_at");