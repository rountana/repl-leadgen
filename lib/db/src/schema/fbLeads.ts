import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { fbCampaignsTable } from "./fbCampaigns";

export const fbLeadsTable = pgTable("fb_leads", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => fbCampaignsTable.id),
  userId: text("user_id").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FbLead = typeof fbLeadsTable.$inferSelect;
