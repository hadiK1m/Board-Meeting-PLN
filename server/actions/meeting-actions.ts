"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

interface MeetingData {
    id: string
    executionDate: string
    startTime: string
    endTime: string
    meetingMethod: string
    location?: string
    link?: string
}

/**
 * Menjadwalkan atau Memperbarui Jadwal Rapat (Universal).
 * Fungsi ini menangani pembuatan jadwal pertama kali maupun update jadwal yang sudah ada.
 *
 */
export async function upsertMeetingScheduleAction(data: MeetingData) {
    try {
        if (!data.id) return { success: false, error: "ID Agenda diperlukan" };

        await db.update(agendas).set({
            executionDate: data.executionDate,
            startTime: data.startTime,
            endTime: data.endTime || "Selesai",
            meetingMethod: data.meetingMethod,
            meetingLocation: data.location || null,
            meetingLink: data.link || null,
            status: "DIJADWALKAN",
            updatedAt: new Date(),
        }).where(eq(agendas.id, data.id));

        // Revalidate halaman terkait jadwal dan daftar siap sidang
        revalidatePath("/jadwal-rapat");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda-siap/rakordir");

        return { success: true, message: "Jadwal rapat berhasil diproses" };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal memproses jadwal rapat";
        console.error("❌ Error in upsertMeetingScheduleAction:", msg);
        return { success: false, error: msg };
    }
}

/**
 * Membatalkan Jadwal (Rollback ke status Siap Sidang).
 * Menghapus detail jadwal dan mengembalikan status ke 'DAPAT_DILANJUTKAN'.
 *
 */
export async function rollbackMeetingScheduleAction(id: string) {
    try {
        await db.update(agendas).set({
            status: "DAPAT_DILANJUTKAN",
            executionDate: null,
            startTime: null,
            endTime: "Selesai",
            meetingMethod: null,
            meetingLocation: null,
            meetingLink: null,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id));

        // Revalidate semua path yang mungkin menampilkan data jadwal ini
        revalidatePath("/jadwal-rapat");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda-siap/rakordir");
        revalidatePath("/agenda/radir");
        revalidatePath("/agenda/rakordir");

        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal melakukan rollback jadwal.";
        console.error("[ROLLBACK-ERROR]:", msg);
        return { success: false, error: msg };
    }
}