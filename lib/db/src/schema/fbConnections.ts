import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fbConnectionsTable = pgTable(
  "fb_connections",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    partnerToken: text("partner_token"),
    fbPageId: text("fb_page_id"),
    fbPageName: text("fb_page_name"),
    adAccountId: text("ad_account_id"),
    adAccountName: text("ad_account_name"),
    status: text("status").notNull().default("disconnected"), // 'connected' | 'disconnected'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("fb_connections_user_id_idx").on(t.userId)],
);

export const insertFbConnectionSchema = createInsertSchema(fbConnectionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFbConnection = z.infer<typeof insertFbConnectionSchema>;
export type FbConnection = typeof fbConnectionsTable.$inferSelect;
