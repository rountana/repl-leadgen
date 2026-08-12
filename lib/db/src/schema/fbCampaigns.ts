import { pgTable, text, serial, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fbConnectionsTable } from "./fbConnections";

export const fbCampaignsTable = pgTable(
  "fb_campaigns",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    connectionId: integer("connection_id").references(() => fbConnectionsTable.id),
    headline: text("headline"),
    bodyText: text("body_text"),
    imageUrl: text("image_url"),
    dailyBudgetCents: integer("daily_budget_cents"),
    targetingRadiusMiles: integer("targeting_radius_miles"),
    targetingLatitude: numeric("targeting_latitude"),
    targetingLongitude: numeric("targeting_longitude"),
    partnerCampaignId: text("partner_campaign_id"),
    status: text("status").notNull().default("draft"), // 'draft' | 'launching' | 'live' | 'error'
    leadDeliveryStatus: text("lead_delivery_status").notNull().default("unverified"), // 'unverified' | 'active' | 'failed'
    destinationUrl: text("destination_url"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("fb_campaigns_user_id_idx").on(t.userId)],
);

export const insertFbCampaignSchema = createInsertSchema(fbCampaignsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFbCampaign = z.infer<typeof insertFbCampaignSchema>;
export type FbCampaign = typeof fbCampaignsTable.$inferSelect;
