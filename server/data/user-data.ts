import { db } from "@/db"; // Pastikan Anda sudah setup db client di src/db/index.ts
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

// Cache request agar tidak query berulang kali di satu render cycle
export const getUserProfile = cache(async (userId: string) => {
    const data = await db.query.profiles.findFirst({
        where: eq(profiles.id, userId),
    });

    return data;
});