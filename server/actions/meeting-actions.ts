/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData" // Import master data untuk default attendance

// --- INTERFACES ---

interface Option {
    label: string
    value: string
}

interface DecisionItem {
    id: string
    text: string
}

interface ConsiderationItem {
    id: string
    text: string
}

interface Guest {
    id: number
    name: string
    position: string
}

interface MeetingScheduleData {
    id: string
    executionDate: string
    startTime: string
    endTime: string
    meetingMethod: string
    location?: string
    link?: string
}

interface RisalahData {
    agendaId: string
    startTime: string
    endTime: string
    meetingLocation: string
    meetingNumber?: string
    meetingYear?: string
    risalahGroupId?: string // Tambahkan ini agar bisa menerima ID dari client
    pimpinanRapat: Option[]
    attendanceData: Record<string, {
        status: string
        reason?: string
        proxy?: readonly Option[]
    }>
    guestParticipants: Guest[]
    executiveSummary: string
    considerations: string | ConsiderationItem[]
    risalahBody: string
    meetingDecisions: DecisionItem[]
    dissentingOpinion: string
}

/**
 * HELPER: Memastikan data kehadiran tidak kosong
 */
function ensureDefaultAttendance(data: any) {
    if (!data || Object.keys(data).length === 0) {
        return DIREKTURE_PEMRAKARSA.reduce((acc, name) => ({
            ...acc,
            [name]: { status: "Hadir", reason: "", proxy: [] }
        }), {});
    }
    return data;
}

/**
 * 1. Menjadwalkan atau Memperbarui Jadwal Rapat
 */
export async function upsertMeetingScheduleAction(data: MeetingScheduleData) {
    try {
        if (!data.id) return { success: false, error: "ID Agenda diperlukan" }

        await db.update(agendas).set({
            executionDate: data.executionDate,
            startTime: data.startTime,
            endTime: data.endTime || "Selesai",
            meetingMethod: data.meetingMethod,
            meetingLocation: data.location || null,
            meetingLink: data.link || null,
            status: "DIJADWALKAN",
            updatedAt: new Date(),
        }).where(eq(agendas.id, data.id))

        revalidatePath("/jadwal-rapat")
        revalidatePath("/agenda-siap/radir")
        revalidatePath("/pelaksanaan-rapat/radir")

        return { success: true, message: "Jadwal rapat berhasil diproses" }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal memproses jadwal rapat"
        return { success: false, error: msg }
    }
}

/**
 * 2. Membatalkan Jadwal (Rollback)
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
        }).where(eq(agendas.id, id))

        revalidatePath("/jadwal-rapat")
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: "Gagal rollback" }
    }
}

/**
 * 3. Menyimpan Risalah Pelaksanaan Rapat - Single Agenda
 */
export async function saveMeetingRisalahAction(data: RisalahData) {
    try {
        if (!data.agendaId) return { success: false, error: "ID Agenda tidak ditemukan" }

        // Pastikan attendanceData berisi default jika kosong
        const finalAttendance = ensureDefaultAttendance(data.attendanceData);

        const considerationsString = Array.isArray(data.considerations)
            ? data.considerations
                .map(item => item.text.trim())
                .filter(Boolean)
                .join("\n")
            : data.considerations

        await db.update(agendas).set({
            startTime: data.startTime,
            endTime: data.endTime,
            meetingLocation: data.meetingLocation,
            meetingNumber: data.meetingNumber || null,
            meetingYear: data.meetingYear || null,
            pimpinanRapat: data.pimpinanRapat,
            attendanceData: finalAttendance, // Gunakan hasil helper
            guestParticipants: data.guestParticipants,
            executiveSummary: data.executiveSummary,
            considerations: considerationsString,
            risalahBody: data.risalahBody,
            meetingDecisions: data.meetingDecisions,
            dissentingOpinion: data.dissentingOpinion,
            risalahGroupId: data.risalahGroupId, // Gunakan ID yang dikirim client
            status: "SEDANG_BERLANGSUNG",
            meetingStatus: "COMPLETED",
            updatedAt: new Date(),
        }).where(eq(agendas.id, data.agendaId))

        revalidatePath("/pelaksanaan-rapat/radir")
        revalidatePath("/dashboard")

        return { success: true, message: "Risalah rapat berhasil disimpan" }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan risalah"
        console.error("❌ Error in saveMeetingRisalahAction:", msg)
        return { success: false, error: msg }
    }
}

/**
 * 4. Simpan Risalah Rapat secara Bulk
 */
export async function saveBulkMeetingRisalahAction(data: any) {
    try {
        if (!data.agendaIds || data.agendaIds.length === 0) return { success: false, error: "Agenda tidak dipilih" }

        const finalAttendance = ensureDefaultAttendance(data.attendanceData);

        const considerationsString = Array.isArray(data.considerations)
            ? data.considerations.map((item: any) => item.text.trim()).filter(Boolean).join("\n")
            : data.considerations

        await db.update(agendas).set({
            startTime: data.startTime,
            endTime: data.endTime,
            meetingLocation: data.meetingLocation,
            meetingNumber: data.meetingNumber || null,
            meetingYear: data.meetingYear || null,
            pimpinanRapat: data.pimpinanRapat,
            attendanceData: finalAttendance,
            guestParticipants: data.guestParticipants,
            executiveSummary: data.executiveSummary,
            considerations: considerationsString,
            risalahBody: data.risalahBody,
            meetingDecisions: data.meetingDecisions,
            dissentingOpinion: data.dissentingOpinion,
            risalahGroupId: data.risalahGroupId,
            status: "SEDANG_BERLANGSUNG",
            meetingStatus: "COMPLETED",
            updatedAt: new Date(),
        }).where(inArray(agendas.id, data.agendaIds))

        revalidatePath("/pelaksanaan-rapat/radir")
        return { success: true, message: "Risalah bulk berhasil disimpan" }
    } catch (error: unknown) {
        return { success: false, error: "Gagal menyimpan bulk" }
    }
}

export async function getRadirMonitoringData() {
    try {
        // Hanya ambil agenda RADIR yang SUDAH memiliki Nomor Meeting
        const allAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingType, "RADIR"),
                isNotNull(agendas.meetingNumber) // Saring di level Database
            ),
            orderBy: [desc(agendas.meetingYear), desc(agendas.meetingNumber)]
        });

        // Grouping logic tetap sama, tapi sekarang pasti punya nomor
        const groupedMeetings = allAgendas.reduce((acc: any[], current) => {
            const key = `${current.meetingNumber}-${current.meetingYear}`;
            const existingGroup = acc.find(item => item.groupKey === key);

            if (existingGroup) {
                existingGroup.agendas.push(current);
                if (current.meetingStatus === "COMPLETED") existingGroup.status = "COMPLETED";
            } else {
                acc.push({
                    groupKey: key,
                    meetingNumber: current.meetingNumber,
                    meetingYear: current.meetingYear,
                    executionDate: current.executionDate,
                    startTime: current.startTime,
                    endTime: current.endTime,
                    location: current.meetingLocation,
                    status: current.meetingStatus || "SCHEDULED",
                    agendas: [current]
                });
            }
            return acc;
        }, []);

        const readyAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingType, "RADIR"),
                eq(agendas.status, "DIJADWALKAN")
            ),
            orderBy: [desc(agendas.priority), desc(agendas.createdAt)]
        });

        return { success: true, groupedMeetings, readyAgendas };
    } catch (error) {
        console.error("Error fetching monitoring data:", error);
        return { success: false, error: "Gagal mengambil data", groupedMeetings: [], readyAgendas: [] };
    }
}