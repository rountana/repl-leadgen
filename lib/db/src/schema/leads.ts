import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  leadMagnetId: integer("lead_magnet_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leadsTable.$inferSelect;
