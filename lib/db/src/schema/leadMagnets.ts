import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadMagnetsTable = pgTable("lead_magnets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull().default("give_away"), // 'existing_url' | 'give_away'
  status: text("status").notNull().default("draft"), // 'draft' | 'review' | 'live'
  title: text("title"),
  description: text("description"),
  existingUrl: text("existing_url"),
  businessName: text("business_name"),
  businessLocation: text("business_location"),
  giveawayFileName: text("giveaway_file_name"),
  giveawayFileUrl: text("giveaway_file_url"),
  templateId: integer("template_id"),
  customFontColor: text("custom_font_color"),
  customBgColor: text("custom_bg_color"),
  customTextColor: text("custom_text_color"),
  logoUrl: text("logo_url"),
  tagline: text("tagline"),
  shareUrl: text("share_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadMagnetSchema = createInsertSchema(leadMagnetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLeadMagnet = z.infer<typeof insertLeadMagnetSchema>;
export type LeadMagnet = typeof leadMagnetsTable.$inferSelect;
