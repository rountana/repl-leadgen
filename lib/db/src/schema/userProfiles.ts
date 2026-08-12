import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const userProfilesTable = pgTable(
  "user_profiles",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    businessName: text("business_name"),
    businessLocation: text("business_location"),
    industry: text("industry"),
    /** Data URL (base64) or remote https:// URL */
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("user_profiles_user_id_idx").on(t.userId)],
);

export type UserProfile = typeof userProfilesTable.$inferSelect;
