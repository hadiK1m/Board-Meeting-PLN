import { db } from "@/db";
import { users } from "@/db/schema"; // ✅ Ganti 'profiles' jadi 'users'
import { eq } from "drizzle-orm";

// Fungsi untuk mendapatkan user berdasarkan email
export const getUserByEmail = async (email: string) => {
    try {
        const user = await db.query.users.findFirst({ // ✅ Ganti db.query.profiles jadi db.query.users
            where: eq(users.email, email),
        });

        return user;
    } catch {
        return null;
    }
};

// Fungsi untuk mendapatkan user berdasarkan ID
export const getUserById = async (id: string) => {
    try {
        const user = await db.query.users.findFirst({ // ✅ Ganti db.query.profiles jadi db.query.users
            where: eq(users.id, id),
        });

        return user;
    } catch {
        return null;
    }
};