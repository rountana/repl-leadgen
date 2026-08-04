import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examplesTable = pgTable("examples", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  giveawayType: text("giveaway_type").notNull(), // 'checklist' | 'guide' | 'discount' | 'template'
  imageUrl: text("image_url"),
});

export const insertExampleSchema = createInsertSchema(examplesTable).omit({ id: true });
export type InsertExample = z.infer<typeof insertExampleSchema>;
export type Example = typeof examplesTable.$inferSelect;
