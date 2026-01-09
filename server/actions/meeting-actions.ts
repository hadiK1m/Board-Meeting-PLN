"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

// --- INTERFACES ---

interface Option {
    label: string;
    value: string;
}

interface DecisionItem {
    id: number;
    text: string;
}

interface Guest {
    id: number;
    name: string;
    position: string;
}

interface MeetingScheduleData {
    id: string;
    executionDate: string;
    startTime: string;
    endTime: string;
    meetingMethod: string;
    location?: string;
    link?: string;
}

interface RisalahData {
    agendaId: string;
    startTime: string;
    endTime: string;
    meetingLocation: string;
    pimpinanRapat: Option[];
    attendanceData: Record<string, {
        status: string;
        reason?: string;
        proxy?: readonly Option[];
    }>;
    guestParticipants: Guest[];
    executiveSummary: string;
    considerations: string;
    risalahBody: string;
    meetingDecisions: DecisionItem[];
    dissentingOpinion: string;
}

/**
 * 1. Menjadwalkan atau Memperbarui Jadwal Rapat.
 */
export async function upsertMeetingScheduleAction(data: MeetingScheduleData) {
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

        revalidatePath("/jadwal-rapat");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda-siap/rakordir");
        revalidatePath("/pelaksanaan-rapat/radir");

        return { success: true, message: "Jadwal rapat berhasil diproses" };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal memproses jadwal rapat";
        console.error("❌ Error in upsertMeetingScheduleAction:", msg);
        return { success: false, error: msg };
    }
}

/**
 * 2. Membatalkan Jadwal (Rollback).
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

        revalidatePath("/jadwal-rapat");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda-siap/rakordir");

        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal melakukan rollback jadwal.";
        console.error("[ROLLBACK-ERROR]:", msg);
        return { success: false, error: msg };
    }
}

/**
 * 3. Menyimpan Risalah Pelaksanaan Rapat (FINAL).
 */
export async function saveMeetingRisalahAction(data: RisalahData) {
    try {
        if (!data.agendaId) return { success: false, error: "ID Agenda tidak ditemukan" };

        await db.update(agendas).set({
            startTime: data.startTime,
            endTime: data.endTime,
            meetingLocation: data.meetingLocation,

            pimpinanRapat: data.pimpinanRapat,
            attendanceData: data.attendanceData,
            guestParticipants: data.guestParticipants,

            executiveSummary: data.executiveSummary,
            considerations: data.considerations,
            risalahBody: data.risalahBody,
            meetingDecisions: data.meetingDecisions,
            dissentingOpinion: data.dissentingOpinion,

            meetingStatus: "COMPLETED",
            status: "SELESAI_SIDANG",
            updatedAt: new Date(),
        }).where(eq(agendas.id, data.agendaId));

        revalidatePath("/pelaksanaan-rapat/radir");
        revalidatePath("/pelaksanaan-rapat/rakordir");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/dashboard");

        return { success: true, message: "Risalah rapat berhasil disimpan secara permanen" };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan risalah rapat";
        console.error("❌ Error in saveMeetingRisalahAction:", msg);
        return { success: false, error: msg };
    }
}