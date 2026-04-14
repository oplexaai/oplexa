import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const aiConfig = pgTable("oplexa_ai_config", {
  id: serial("id").primaryKey(),
  systemPrompt: text("system_prompt").notNull().default(""),
  personality: text("personality").notNull().default(""),
  restrictions: text("restrictions").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
