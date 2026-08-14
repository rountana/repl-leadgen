import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { fbConnectionsTable } from "./fbConnections";

/**
 * One shared Meta campaign per (connection, ad_account).
 * A user can have multiple ad accounts; each gets its own campaign row so
 * switching accounts never reuses a campaign that belongs to a different account.
 */
export const fbConnectionCampaignsTable = pgTable(
  "fb_connection_campaigns",
  {
    id: serial("id").primaryKey(),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => fbConnectionsTable.id, { onDelete: "cascade" }),
    adAccountId: text("ad_account_id").notNull(),
    partnerCampaignId: text("partner_campaign_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fb_connection_campaigns_conn_account_idx").on(t.connectionId, t.adAccountId),
  ],
);
