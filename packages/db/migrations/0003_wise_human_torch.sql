CREATE TABLE "changelog_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"subscribed_at" bigint NOT NULL,
	CONSTRAINT "changelog_subscription_user_id_organization_id_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "changelog_subscription" ADD CONSTRAINT "changelog_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_subscription" ADD CONSTRAINT "changelog_subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changelog_subscription_org_idx" ON "changelog_subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "changelog_subscription_user_idx" ON "changelog_subscription" USING btree ("user_id");