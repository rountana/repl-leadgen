CREATE TABLE "lead_magnets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text DEFAULT 'give_away' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text,
	"description" text,
	"existing_url" text,
	"business_name" text,
	"business_location" text,
	"giveaway_file_name" text,
	"giveaway_file_url" text,
	"template_id" integer,
	"custom_font_color" text,
	"custom_bg_color" text,
	"custom_text_color" text,
	"logo_url" text,
	"tagline" text,
	"cta_text" text,
	"share_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"layout" text NOT NULL,
	"description" text NOT NULL,
	"preview_color" text NOT NULL,
	"accent_color" text NOT NULL,
	"font_family" text NOT NULL,
	"sample_image_url" text
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "industries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "examples" (
	"id" serial PRIMARY KEY NOT NULL,
	"industry" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"giveaway_type" text NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_magnet_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fb_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"partner_token" text,
	"fb_page_id" text,
	"fb_page_name" text,
	"ad_account_id" text,
	"ad_account_name" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fb_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" integer,
	"headline" text,
	"body_text" text,
	"image_url" text,
	"daily_budget_cents" integer,
	"targeting_radius_miles" integer,
	"targeting_latitude" numeric,
	"targeting_longitude" numeric,
	"partner_campaign_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"lead_delivery_status" text DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fb_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fb_campaigns" ADD CONSTRAINT "fb_campaigns_connection_id_fb_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."fb_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fb_leads" ADD CONSTRAINT "fb_leads_campaign_id_fb_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."fb_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fb_connections_user_id_idx" ON "fb_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fb_campaigns_user_id_idx" ON "fb_campaigns" USING btree ("user_id");