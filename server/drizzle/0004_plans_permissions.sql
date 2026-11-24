ALTER TABLE "branches" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
-- Permission keys renamed to CoreWave's names. clients.delete covered clients and memberships, so it becomes both keys.
UPDATE "roles" SET "permissions" = array_remove("permissions", 'clients.delete') || ARRAY['clients.archive', 'data.delete']::text[]
WHERE 'clients.delete' = ANY("permissions");--> statement-breakpoint
UPDATE "roles" SET "permissions" = array_replace("permissions", 'settings.gym', 'settings.branch')
WHERE 'settings.gym' = ANY("permissions");--> statement-breakpoint
-- Grandfathering, same rules as grandfatherPlans() in src/services/plan.ts: nothing a gym uses today gets locked.
UPDATE "branches" SET "plan" = 'max'
WHERE "plan" = 'free' AND "id" IN (SELECT "branch_id" FROM "biometric_devices");--> statement-breakpoint
UPDATE "branches" SET "plan" = 'pro'
WHERE "plan" = 'free' AND (
    "id" IN (SELECT "branch_id" FROM "branch_settings" WHERE "whatsapp_phone_number_id" IS NOT NULL)
    OR "id" IN (SELECT "branch_id" FROM "users" WHERE "role" NOT IN ('admin', 'owner'))
);
