import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const siteContent = sqliteTable("site_content", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by"),
});

export const siteEditors = sqliteTable("site_editors", {
  email: text("email").primaryKey(),
  createdAt: text("created_at").notNull(),
});
