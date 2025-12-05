CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"polar_customer_id" text NOT NULL,
	"polar_product_id" text NOT NULL,
	"polar_product_name" text,
	"status" text NOT NULL,
	"current_period_start" bigint,
	"current_period_end" bigint,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_tier" text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;