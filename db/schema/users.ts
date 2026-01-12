import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

/**
 * TABEL USERS
 * Menyimpan profil tambahan di luar tabel auth.users bawaan Supabase
 * Disinkronkan biasanya via Trigger atau insert manual saat register
 */
export const users = pgTable("users", {
    id: uuid("id").primaryKey().notNull(), // Wajib sama dengan ID di auth.users Supabase
    email: text("email").notNull(),
    name: text("full_name"),               // Nama lengkap
    avatarUrl: text("avatar_url"),
    role: text("role").default("user").notNull(), // admin, director, sekretariat, user

    // ✅ Kolom Tambahan untuk Fitur 2FA
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    twoFactorSecret: text("two_factor_secret"), // Secret key terenkripsi/plain text (tergantung kebijakan)

    updatedAt: timestamp("updated_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * TABEL LOGIN LOGS
 * Untuk mencatat riwayat login (Audit Trail)
 */
export const loginLogs = pgTable("login_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" }) // Hapus log jika user dihapus
        .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    timestamp: timestamp("timestamp").defaultNow(),
});