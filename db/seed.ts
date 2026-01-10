import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path"; // Tambahkan ini

// 1. Force load .env.local dengan Absolute Path
// Ini memastikan file dibaca dari root project, bukan relatif folder db/
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Debugging: Cek apakah env terbaca (Hanya print 5 karakter pertama agar aman)
console.log("DEBUG ENV:", {
    URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Loaded ✅" : "Missing ❌",
    KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Loaded ✅" : "Missing ❌",
});

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase URL or Service Role Key is missing in .env.local");
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

async function main() {
    console.log("🌱 Starting seed...");

    const TEST_EMAIL = "admin@pln.co.id";
    const TEST_PASSWORD = "password123";

    console.log(`Creating user: ${TEST_EMAIL}...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
            full_name: "Admin Board",
            avatar_url: "https://github.com/shadcn.png",
        },
    });

    if (error) {
        console.error("❌ Error creating user:", error.message);
    } else {
        console.log("✅ User created successfully!");
        console.log(`🆔 UUID: ${data.user.id}`);
        console.log("Trigger Database Supabase seharusnya otomatis mengisi tabel 'profiles'.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });