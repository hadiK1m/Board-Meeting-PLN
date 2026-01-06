// src/db/schema/users.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().notNull(), // Harus match dengan Auth ID Supabase
    email: text("email").notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    role: text("role").default("user").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});