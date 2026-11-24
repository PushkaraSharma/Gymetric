CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"member_id" uuid,
	"device_id" uuid,
	"pin" integer,
	"status" text NOT NULL,
	"deny_reason" text,
	"punched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "biometric_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"branch_id" uuid NOT NULL,
	"serial_number" text NOT NULL,
	"name" text DEFAULT 'Entrance' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"last_command_id" integer DEFAULT 0 NOT NULL,
	"next_pin" integer DEFAULT 1001 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biometric_devices_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "device_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"cmd_id" integer NOT NULL,
	"type" text NOT NULL,
	"pin" integer NOT NULL,
	"name" text,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"acked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "device_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_mongo_id" text,
	"device_id" uuid NOT NULL,
	"member_id" uuid,
	"staff_id" uuid,
	"pin" integer NOT NULL,
	"fingerprint_status" text DEFAULT 'none' NOT NULL,
	"enrolled_at" timestamp with time zone,
	CONSTRAINT "device_enrollments_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id"),
	CONSTRAINT "device_enrollments_subject" CHECK (("device_enrollments"."member_id" is null) <> ("device_enrollments"."staff_id" is null))
);
--> statement-breakpoint
CREATE TABLE "fingerprint_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"fid" integer NOT NULL,
	"size" integer NOT NULL,
	"template" text NOT NULL,
	"on_device" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "attendance_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD COLUMN "device_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD COLUMN "pin" integer;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_device_id_biometric_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."biometric_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_devices" ADD CONSTRAINT "biometric_devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_device_id_biometric_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."biometric_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollments" ADD CONSTRAINT "device_enrollments_device_id_biometric_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."biometric_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollments" ADD CONSTRAINT "device_enrollments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollments" ADD CONSTRAINT "device_enrollments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fingerprint_templates" ADD CONSTRAINT "fingerprint_templates_enrollment_id_device_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."device_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_branch_time" ON "attendance" USING btree ("branch_id","punched_at");--> statement-breakpoint
CREATE INDEX "attendance_member_time" ON "attendance" USING btree ("member_id","punched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "biometric_devices_serial" ON "biometric_devices" USING btree ("serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX "device_commands_once" ON "device_commands" USING btree ("device_id","cmd_id");--> statement-breakpoint
CREATE INDEX "device_commands_status" ON "device_commands" USING btree ("device_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "device_enrollments_pin" ON "device_enrollments" USING btree ("device_id","pin");--> statement-breakpoint
CREATE UNIQUE INDEX "device_enrollments_member" ON "device_enrollments" USING btree ("device_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_enrollments_staff" ON "device_enrollments" USING btree ("device_id","staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fingerprint_templates_finger" ON "fingerprint_templates" USING btree ("enrollment_id","fid");--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_device_id_biometric_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."biometric_devices"("id") ON DELETE set null ON UPDATE no action;