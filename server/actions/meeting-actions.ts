/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"
import { createClient } from "@/lib/supabase/server" // [SECURE] Tambahan untuk Auth

// --- INTERFACES (TETAP SESUAI ASLI) ---
interface Option { label: string; value: string }
interface DecisionItem { id: string; text: string }
interface ConsiderationItem { id: string; text: string }
interface Guest { id: number; name: string; position: string }
interface MeetingScheduleData {
    id: string; executionDate: string; startTime: string; endTime: string;
    meetingMethod: string; location?: string; link?: string;
}
interface RisalahData {
    agendaId: string; startTime: string; endTime: string; meetingLocation: string;
    meetingNumber?: string; meetingYear?: string; risalahGroupId?: string;
    pimpinanRapat: Option[]; attendanceData: Record<string, {
        status: string; reason?: string; proxy?: readonly Option[];
    }>;
    guestParticipants: Guest[]; executiveSummary: string;
    considerations: string | ConsiderationItem[]; risalahBody: string;
    meetingDecisions: DecisionItem[]; dissentingOpinion: string;
}

// --- HELPER: AUTH GUARD (PENYEMPURNAAN KEAMANAN) ---
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        throw new Error("Unauthorized: Anda harus login untuk melakukan aksi ini.")
    }
    return { user, supabase }
}

// --- HELPER: MEMASTIKAN DATA KEHADIRAN (LOGIKA ASLI DIPERTAHANKAN) ---
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
        await assertAuthenticated() // [SECURE]
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
    } catch (error: any) {
        return { success: false, error: error.message || "Gagal memproses jadwal" }
    }
}

/**
 * 2. Membatalkan Jadwal (Rollback)
 */
export async function rollbackMeetingScheduleAction(id: string) {
    try {
        await assertAuthenticated() // [SECURE]
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
    } catch (error: any) {
        return { success: false, error: error.message || "Gagal rollback" }
    }
}

/**
 * 3. Menyimpan Risalah Pelaksanaan Rapat - Single Agenda
 */
export async function saveMeetingRisalahAction(data: RisalahData) {
    try {
        await assertAuthenticated() // [SECURE]
        if (!data.agendaId) return { success: false, error: "ID Agenda tidak ditemukan" }

        const finalAttendance = ensureDefaultAttendance(data.attendanceData);

        const considerationsString = Array.isArray(data.considerations)
            ? data.considerations.map(item => item.text.trim()).filter(Boolean).join("\n")
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
        }).where(eq(agendas.id, data.agendaId))

        revalidatePath("/pelaksanaan-rapat/radir")
        revalidatePath("/dashboard")

        return { success: true, message: "Risalah rapat berhasil disimpan" }
    } catch (error: any) {
        return { success: false, error: error.message || "Gagal menyimpan risalah" }
    }
}

/**
 * 4. Simpan Risalah Rapat secara Bulk
 */
export async function saveBulkMeetingRisalahAction(data: any) {
    try {
        await assertAuthenticated() // [SECURE]
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
    } catch (error: any) {
        return { success: false, error: error.message || "Gagal menyimpan bulk" }
    }
}

/**
 * 5. GET MONITORING DATA (LOGIKA ASLI DIPERTAHANKAN)
 */
export async function getRadirMonitoringData() {
    try {
        await assertAuthenticated() // [SECURE]
        const allAgendas = await db.query.agendas.findMany({
            where: and(eq(agendas.meetingType, "RADIR"), isNotNull(agendas.meetingNumber)),
            orderBy: [desc(agendas.meetingYear), desc(agendas.meetingNumber)]
        });

        const groupedMeetings = allAgendas.reduce((acc: any[], current) => {
            const key = `${current.meetingNumber}-${current.meetingYear}`;
            const existingGroup = acc.find(item => item.groupKey === key);
            if (existingGroup) {
                existingGroup.agendas.push(current);
                if (current.meetingStatus === "COMPLETED") existingGroup.status = "COMPLETED";
            } else {
                acc.push({
                    groupKey: key, meetingNumber: current.meetingNumber, meetingYear: current.meetingYear,
                    executionDate: current.executionDate, startTime: current.startTime, endTime: current.endTime,
                    location: current.meetingLocation, status: current.meetingStatus || "SCHEDULED", agendas: [current]
                });
            }
            return acc;
        }, []);

        const readyAgendas = await db.query.agendas.findMany({
            where: and(eq(agendas.meetingType, "RADIR"), eq(agendas.status, "DIJADWALKAN")),
            orderBy: [desc(agendas.priority), desc(agendas.createdAt)]
        });

        return { success: true, groupedMeetings, readyAgendas };
    } catch (error: any) {
        return { success: false, error: error.message, groupedMeetings: [], readyAgendas: [] };
    }
}

/**
 * 6. UPDATE RAKORDIR LIVE (LOGIKA TRANSACTION ASLI DIPERTAHANKAN)
 */
export async function updateRakordirLiveAction(
    agendasData: any[],
    meetingInfo: {
        number: string; year: string; date: string; day?: string; location: string;
        startTime: string; endTime: string; pimpinanRapat: string; catatanKetidakhadiran: string;
    }
) {
    try {
        await assertAuthenticated() // [SECURE]
        await db.transaction(async (tx) => {
            for (const item of agendasData) {
                await tx.update(agendas)
                    .set({
                        meetingNumber: meetingInfo.number,
                        meetingYear: meetingInfo.year,
                        executionDate: meetingInfo.date || null,
                        startTime: meetingInfo.startTime || null,
                        endTime: meetingInfo.endTime || "Selesai",
                        meetingLocation: meetingInfo.location || null,
                        pimpinanRapat: meetingInfo.pimpinanRapat,
                        catatanRapat: meetingInfo.catatanKetidakhadiran,
                        executiveSummary: item.executiveSummary,
                        arahanDireksi: item.arahanDireksi,
                        attendanceData: item.attendanceData,
                        meetingStatus: "COMPLETED",
                        status: "SELESAI",
                        updatedAt: new Date(),
                    })
                    .where(eq(agendas.id, item.id));
            }
        });

        revalidatePath("/pelaksanaan-rapat/rakordir");
        revalidatePath(`/pelaksanaan-rapat/rakordir/live`);

        return { success: true, message: "Notulensi Rakordir berhasil disimpan dan disinkronkan." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 7. RESET RAKORDIR SESSION (LOGIKA ASLI DIPERTAHANKAN)
 */
export async function resetRakordirSessionAction(meetingNumber: string, meetingYear: string) {
    try {
        await assertAuthenticated() // [SECURE]
        await db.update(agendas)
            .set({
                meetingNumber: null,
                meetingStatus: "PENDING",
                status: "DIJADWALKAN",
                updatedAt: new Date()
            })
            .where(and(eq(agendas.meetingNumber, meetingNumber), eq(agendas.meetingYear, meetingYear), eq(agendas.meetingType, "RAKORDIR")));

        revalidatePath("/pelaksanaan-rapat/rakordir");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 8. FINISH MEETING (LOGIKA ASLI DIPERTAHANKAN)
 */
export async function finishMeetingAction(meetingNumber: string, meetingYear: string) {
    try {
        await assertAuthenticated() // [SECURE]
        await db.update(agendas)
            .set({
                meetingStatus: "COMPLETED",
                status: "RAPAT_SELESAI",
                endTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                updatedAt: new Date(),
            })
            .where(and(eq(agendas.meetingNumber, meetingNumber), eq(agendas.meetingYear, meetingYear)))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")
        revalidatePath("/pelaksanaan-rapat/radir")
        revalidatePath("/monev/radir")

        return { success: true, message: "Rapat selesai." }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}