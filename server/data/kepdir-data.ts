// src/server/data/kepdir-data.ts
import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { eq, and, desc } from "drizzle-orm";

/**
 * Mengambil semua agenda dengan tipe KEPDIR_SIRKULER
 * Diurutkan berdasarkan update terbaru
 */
export async function getKepdirSirkulerAgendas() {
    try {
        const data = await db.query.agendas.findMany({
            where: eq(agendas.meetingType, "KEPDIR_SIRKULER"),
            orderBy: [desc(agendas.updatedAt)],
        });

        return data;
    } catch (error) {
        console.error("Error fetching Kepdir Sirkuler data:", error);
        return [];
    }
}

/**
 * Mengambil satu agenda Kepdir berdasarkan ID
 */
export async function getKepdirById(id: string) {
    try {
        const data = await db.query.agendas.findFirst({
            where: and(
                eq(agendas.id, id),
                eq(agendas.meetingType, "KEPDIR_SIRKULER")
            ),
        });

        return data || null;
    } catch (error) {
        console.error(`Error fetching Kepdir with ID ${id}:`, error);
        return null;
    }
}

/**
 * Mengambil agenda Kepdir berdasarkan status tertentu
 * Contoh: Untuk melihat mana yang masih 'DRAFT' atau 'SELESAI'
 */
export async function getKepdirByStatus(status: string) {
    try {
        const data = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingType, "KEPDIR_SIRKULER"),
                eq(agendas.status, status)
            ),
            orderBy: [desc(agendas.createdAt)],
        });

        return data;
    } catch (error) {
        console.error(`Error fetching Kepdir with status ${status}:`, error);
        return [];
    }
}