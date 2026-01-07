"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

// ✅ Tipe data untuk input insert/update agar tidak menggunakan 'any'
type NewAgenda = typeof agendas.$inferInsert;

interface UpdateMeetingData {
    id: string
    executionDate: string
    startTime: string
    endTime: string
    meetingMethod: string
    location?: string
    link?: string
}

type AgendaFileField =
    | "legalReview"
    | "riskReview"
    | "complianceReview"
    | "regulationReview"
    | "recommendationNote"
    | "proposalNote"
    | "presentationMaterial";

const FILE_FIELDS: AgendaFileField[] = [
    "legalReview", "riskReview", "complianceReview",
    "regulationReview", "recommendationNote", "proposalNote", "presentationMaterial"
];

/**
 * 1. ACTION: Create Agenda (RADIR)
 */
export async function createAgendaAction(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: "Sesi kadaluarsa. Silakan login kembali." }
    }

    try {
        const uploadedUrls: Partial<Record<AgendaFileField, string | null>> = {}
        // Parse string JSON dari formData menjadi Array
        const notRequiredFiles = JSON.parse(formData.get("notRequiredFiles") as string || "[]") as string[];

        for (const field of FILE_FIELDS) {
            const file = formData.get(field) as File
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop()
                const path = `radir/${user.id}/${Date.now()}-${field}.${fileExt}`
                const { data, error } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (error) throw error
                uploadedUrls[field] = data.path
            } else {
                uploadedUrls[field] = null
            }
        }

        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []
        for (const file of supportingFiles) {
            if (file && file.size > 0) {
                const cleanName = file.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
                const path = `radir/${user.id}/${Date.now()}-support-${cleanName}`
                const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (data) supportingPaths.push(data.path)
            }
        }

        const allFilesHandled = FILE_FIELDS.every(field =>
            (uploadedUrls[field] !== null) || notRequiredFiles.includes(field)
        );

        const insertData: NewAgenda = {
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: formData.get("priority") as string,
            deadline: new Date(formData.get("deadline") as string),
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            ...uploadedUrls,
            supportingDocuments: supportingPaths,
            notRequiredFiles: notRequiredFiles, // Simpan sebagai Array
            status: allFilesHandled ? "DAPAT_DILANJUTKAN" : "DRAFT",
            meetingType: "RADIR",
        };

        await db.insert(agendas).values(insertData);

        revalidatePath("/agenda/radir")
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan data."
        console.error("Critical Error Create Radir:", msg)
        return { success: false, error: msg }
    }
}

/**
 * 2. ACTION: Update Agenda (RADIR)
 */
export async function updateAgendaAction(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: "Sesi kadaluarsa." }

    try {
        const oldData = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!oldData) return { success: false, error: "Data tidak ditemukan." }

        if (oldData.status === "DIJADWALKAN" || oldData.status === "SELESAI") {
            return { success: false, error: "Agenda sudah dikunci." }
        }

        const updatedUrls: Partial<Record<AgendaFileField, string | null>> = {}
        // ✅ FIX: Parse string dari FormData menjadi Array object sebelum disimpan ke DB
        // Ini mencegah "Double Stringify" di kolom JSONB Postgres
        const notRequiredFiles = JSON.parse(formData.get("notRequiredFiles") as string || "[]") as string[];

        for (const field of FILE_FIELDS) {
            const file = formData.get(field) as File
            const deleteFlag = formData.get(`delete_${field}`) === 'true'
            const oldPath = oldData[field as keyof typeof oldData]

            if (file && file.size > 0) {
                if (typeof oldPath === 'string') await supabase.storage.from('agenda-attachments').remove([oldPath])
                const fileExt = file.name.split('.').pop()
                const path = `radir/${user.id}/${Date.now()}-${field}.${fileExt}`
                const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
                updatedUrls[field] = data?.path || null
            } else if (deleteFlag) {
                if (typeof oldPath === 'string') await supabase.storage.from('agenda-attachments').remove([oldPath])
                updatedUrls[field] = null
            } else {
                updatedUrls[field] = oldPath as string | null
            }
        }

        const allFilesHandled = FILE_FIELDS.every(field =>
            (updatedUrls[field] !== null) || notRequiredFiles.includes(field)
        );

        // ✅ Type-safe update object
        await db.update(agendas).set({
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: formData.get("priority") as string,
            deadline: new Date(formData.get("deadline") as string),
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            ...updatedUrls,
            notRequiredFiles: notRequiredFiles, // ✅ Kirim Array, jangan string
            status: allFilesHandled ? "DAPAT_DILANJUTKAN" : "DRAFT",
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Error update"
        return { success: false, error: msg }
    }
}

// ... (Sisa fungsi scheduleAgendaAction, getSignedFileUrl, deleteBulkAgendasAction, dll tetap sama) ...
// (Pastikan fungsi deleteAgendaAction, cancelAgendaAction, resumeAgendaAction, rollbackAgendaAction, updateScheduledMeetingAction ada di bawah sini seperti kode asli Anda)
export async function scheduleAgendaAction(data: UpdateMeetingData) {
    try {
        await db.update(agendas).set({
            executionDate: data.executionDate,
            startTime: data.startTime,
            endTime: data.endTime || "Selesai",
            meetingMethod: data.meetingMethod,
            meetingLocation: data.location ?? null,
            meetingLink: data.link ?? null,
            status: "DIJADWALKAN",
            updatedAt: new Date(),
        }).where(eq(agendas.id, data.id));

        revalidatePath("/jadwal-rapat");
        revalidatePath("/agenda-siap/radir");
        return { success: true };
    } catch {
        return { success: false, error: "Gagal menjadwalkan rapat" };
    }
}

export async function getSignedFileUrl(path: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.storage
        .from('agenda-attachments')
        .createSignedUrl(path, 60);

    if (error) return null;
    return data.signedUrl;
}

export async function deleteBulkAgendasAction(ids: string[]) {
    const supabase = await createClient()
    try {
        const dataAgendas = await db.select().from(agendas).where(inArray(agendas.id, ids))
        const filesToDelete: string[] = []

        dataAgendas.forEach(agenda => {
            FILE_FIELDS.forEach(field => {
                const path = agenda[field as keyof typeof agenda]
                if (typeof path === 'string') filesToDelete.push(path)
            })
            if (agenda.supportingDocuments) {
                const extra = typeof agenda.supportingDocuments === 'string'
                    ? JSON.parse(agenda.supportingDocuments)
                    : agenda.supportingDocuments
                if (Array.isArray(extra)) filesToDelete.push(...(extra as string[]))
            }
        })

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(inArray(agendas.id, ids))
        revalidatePath("/agenda/radir")
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Error delete"
        return { success: false, error: msg }
    }
}

export async function deleteAgendaAction(id: string) {
    const supabase = await createClient()

    try {
        const dataAgenda = await db.query.agendas.findFirst({
            where: eq(agendas.id, id),
        })

        if (!dataAgenda) return { success: false, error: "Data tidak ditemukan." }

        const filesToDelete: string[] = []

        FILE_FIELDS.forEach(field => {
            const path = dataAgenda[field as keyof typeof dataAgenda]
            if (typeof path === 'string' && path) filesToDelete.push(path)
        })

        if (dataAgenda.supportingDocuments) {
            try {
                const extra = typeof dataAgenda.supportingDocuments === 'string'
                    ? JSON.parse(dataAgenda.supportingDocuments)
                    : dataAgenda.supportingDocuments
                if (Array.isArray(extra)) {
                    filesToDelete.push(...extra.map(String))
                }
            } catch {
                // ignore parse error
            }
        }

        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('agenda-attachments')
                .remove(filesToDelete)

            if (storageError) {
                console.error("[STORAGE-ERROR] Gagal hapus file storage:", storageError.message)
            }
        }

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")

        return { success: true }

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus data."
        console.error("Critical Error Delete:", msg)
        return { success: false, error: msg }
    }
}

const cancelSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter"),
});

export async function cancelAgendaAction(data: z.infer<typeof cancelSchema>) {
    console.log(`[DEBUG-ACTION] Membatalkan Agenda ID: ${data.id}`);

    try {
        const validated = cancelSchema.parse(data);

        await db.update(agendas)
            .set({
                status: "DIBATALKAN",
                cancellationReason: validated.reason,
                updatedAt: new Date()
            })
            .where(eq(agendas.id, validated.id));

        revalidatePath("/agenda/radir");
        revalidatePath("/agenda-siap/radir");

        console.log(`[DEBUG-SUCCESS] Agenda ID: ${data.id} berhasil dibatalkan.`);
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Gagal membatalkan agenda.";
        console.error("[DEBUG-CANCEL-ERROR]:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

export async function resumeAgendaAction(id: string) {
    console.log(`[DEBUG-ACTION] Memulihkan Agenda ID: ${id}`);

    try {
        await db.update(agendas)
            .set({
                status: "DAPAT_DILANJUTKAN",
                cancellationReason: null,
                updatedAt: new Date()
            })
            .where(eq(agendas.id, id));

        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda/radir");

        console.log(`[DEBUG-SUCCESS] Agenda ID: ${id} berhasil dipulihkan.`);
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Gagal memulihkan agenda.";
        console.error("[DEBUG-RESUME-ERROR]:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

export async function lanjutKeAgendaSiapAction(id: string) {
    console.log(`[DEBUG-ACTION] Meneruskan ke Agenda Siap ID: ${id}`);

    try {
        await db.update(agendas)
            .set({
                status: "DAPAT_DILANJUTKAN",
                updatedAt: new Date()
            })
            .where(eq(agendas.id, id));

        revalidatePath("/agenda/radir");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/jadwal-rapat");

        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal memproses data.";
        console.error("[DEBUG-PROSES-ERROR]:", msg);
        return { success: false, error: msg };
    }
}

export async function rollbackAgendaAction(id: string) {
    console.log(`[DEBUG-ACTION] Melakukan Rollback Jadwal ID: ${id}`);

    try {
        await db.update(agendas)
            .set({
                status: "DAPAT_DILANJUTKAN",
                executionDate: null,
                startTime: null,
                endTime: "Selesai",
                meetingMethod: null,
                meetingLocation: null,
                meetingLink: null,
                updatedAt: new Date(),
            })
            .where(eq(agendas.id, id));

        revalidatePath("/jadwal-rapat");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda-siap/rakordir");
        revalidatePath("/agenda/radir");
        revalidatePath("/agenda/rakordir");

        console.log(`[DEBUG-SUCCESS] Rollback sukses untuk ID: ${id}`);
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal membatalkan jadwal rapat.";
        console.error("[DEBUG-ROLLBACK-ERROR]:", msg);
        return { success: false, error: msg };
    }
}

export async function updateScheduledMeetingAction(data: UpdateMeetingData) {
    console.log(`[DEBUG-ACTION] Memperbarui Jadwal Rapat ID: ${data.id}`);

    try {
        if (!data.id) {
            return { success: false, error: "ID Agenda tidak ditemukan" };
        }

        await db.update(agendas)
            .set({
                executionDate: data.executionDate,
                startTime: data.startTime,
                endTime: data.endTime || "Selesai",
                meetingMethod: data.meetingMethod,
                meetingLocation: data.location || null,
                meetingLink: data.link || null,
                status: "DIJADWALKAN",
                updatedAt: new Date(),
            })
            .where(eq(agendas.id, data.id));

        revalidatePath("/jadwal-rapat");
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda-siap/rakordir");

        console.log(`[DEBUG-SUCCESS] Jadwal Rapat ID: ${data.id} berhasil diperbarui.`);

        return {
            success: true,
            message: "Jadwal rapat berhasil diperbarui"
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat memperbarui jadwal.";
        console.error("❌ Error in updateScheduledMeetingAction:", errorMessage);
        return {
            success: false,
            error: errorMessage
        };
    }
}