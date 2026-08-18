import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const fbAdTemplatesTable = pgTable("fb_ad_templates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  headline: text("headline").notNull(),
  bodyText: text("body_text").notNull(),
  imageUrl: text("image_url").notNull(),
  suggestedDailyBudget: integer("suggested_daily_budget"),
  suggestedRadiusMiles: integer("suggested_radius_miles"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FbAdTemplate = typeof fbAdTemplatesTable.$inferSelect;
export type InsertFbAdTemplate = typeof fbAdTemplatesTable.$inferInsert;
