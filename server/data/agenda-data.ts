// src/server/data/agenda-data.ts
import { db } from "@/db";
import { agendas } from "@/db/schema/agendas"; // Pastikan path schema spesifik
import { desc, eq } from "drizzle-orm";
import { differenceInDays } from "date-fns";

/**
 * Fungsi untuk mengambil Agenda RADIR dengan perhitungan prioritas dinamis
 */
export async function getRadirAgendas() {
    try {
        const data = await db.query.agendas.findMany({
            // Filter hanya untuk RADIR jika diperlukan, atau hapus where jika ingin semua
            where: eq(agendas.meetingType, "RADIR"),
            orderBy: [desc(agendas.createdAt)],
        });

        return data.map((item) => {
            // 1. Safety check untuk deadline (mencegah NaN pada differenceInDays)
            if (!item.deadline) {
                return { ...item, calculatedPriority: "Low" };
            }

            // 2. Hitung selisih hari
            const daysRemaining = differenceInDays(new Date(item.deadline), new Date());

            // 3. Logika Prioritas Dinamis
            // Gunakan nama properti baru 'calculatedPriority' agar tidak bentrok 
            // dengan kolom 'priority' asli dari database
            let calculatedPriority: "High" | "Medium" | "Low";

            if (daysRemaining <= 7) {
                calculatedPriority = "High";
            } else if (daysRemaining <= 14) {
                calculatedPriority = "Medium";
            } else {
                calculatedPriority = "Low";
            }

            return {
                ...item,
                calculatedPriority // Properti ini yang akan dipakai di UI Badge
            };
        });
    } catch (error) {
        console.error("Gagal mengambil data Radir:", error);
        return [];
    }
}

export async function getKepdirSirkulerAgendas() {
    try {
        const data = await db.query.agendas.findMany({
            where: eq(agendas.meetingType, "KEPDIR_SIRKULER"),
            orderBy: [desc(agendas.createdAt)],
        });
        return data || [];
    } catch (error) {
        console.error("Error fetching Kepdir Sirkuler:", error);
        return [];
    }
}