import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  layout: text("layout").notNull(), // 'split' | 'banner' | 'overlay' | 'stacked' | 'minimal'
  description: text("description").notNull(),
  previewColor: text("preview_color").notNull(),
  accentColor: text("accent_color").notNull(),
  fontFamily: text("font_family").notNull(),
  sampleImageUrl: text("sample_image_url"),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({ id: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
