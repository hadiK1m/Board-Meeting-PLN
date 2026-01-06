"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

// Definisikan tipe untuk field file agar type-safe
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
 * NEW ACTION: Cancel Agenda
 * Logika khusus untuk membatalkan agenda dari halaman Agenda Siap
 */
const cancelSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter"),
});

export async function cancelAgendaAction(data: z.infer<typeof cancelSchema>) {
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

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal membatalkan agenda."
        return { success: false, error: errorMessage };
    }
}

export async function createAgendaAction(formData: FormData) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: "Sesi kadaluarsa. Silakan login kembali." }
    }

    try {
        const uploadedUrls: Record<string, string | null> = {}
        const notRequiredFiles = JSON.parse(formData.get("notRequiredFiles") as string || "[]") as string[];

        for (const field of FILE_FIELDS) {
            const file = formData.get(field) as File
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop()
                const path = `${user.id}/${Date.now()}-${field}.${fileExt}`

                const { data, error } = await supabase.storage
                    .from('agenda-attachments')
                    .upload(path, file)

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
                const path = `${user.id}/${Date.now()}-support-${cleanName}`
                const { data } = await supabase.storage
                    .from('agenda-attachments')
                    .upload(path, file)
                if (data) supportingPaths.push(data.path)
            }
        }

        // LOGIKA PENENTUAN STATUS
        const allFilesHandled = FILE_FIELDS.every(field =>
            (uploadedUrls[field] !== null) || notRequiredFiles.includes(field)
        );

        const finalStatus = allFilesHandled ? "Dapat Dilanjutkan" : "Draft";

        await db.insert(agendas).values({
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
            legalReview: uploadedUrls.legalReview,
            riskReview: uploadedUrls.riskReview,
            complianceReview: uploadedUrls.complianceReview,
            regulationReview: uploadedUrls.regulationReview,
            recommendationNote: uploadedUrls.recommendationNote,
            proposalNote: uploadedUrls.proposalNote,
            presentationMaterial: uploadedUrls.presentationMaterial,
            supportingDocuments: supportingPaths,
            notRequiredFiles: notRequiredFiles,
            status: finalStatus,
        })

        revalidatePath("/agenda/radir")
        return { success: true }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan data."
        console.error("Critical Error Create:", errorMessage)
        return { success: false, error: errorMessage }
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
            if (typeof path === 'string') filesToDelete.push(path)
        })

        if (dataAgenda.supportingDocuments && Array.isArray(dataAgenda.supportingDocuments)) {
            filesToDelete.push(...(dataAgenda.supportingDocuments as string[]))
        }

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")
        return { success: true }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menghapus data."
        console.error("Critical Error Delete:", errorMessage)
        return { success: false, error: errorMessage }
    }
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
            if (agenda.supportingDocuments && Array.isArray(agenda.supportingDocuments)) {
                filesToDelete.push(...(agenda.supportingDocuments as string[]))
            }
        })

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(inArray(agendas.id, ids))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")
        return { success: true }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menghapus data terpilih."
        console.error("Critical Error Bulk Delete:", errorMessage)
        return { success: false, error: errorMessage }
    }
}

export async function updateAgendaAction(id: string, formData: FormData) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: "Sesi kadaluarsa. Silakan login kembali." }

    try {
        // 1. Ambil data lama untuk pengecekan status dan manajemen file
        const oldData = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!oldData) return { success: false, error: "Data tidak ditemukan." }

        // ✅ 2. LOGIKA PROTEKSI: Cek jika agenda sudah dijadwalkan
        // Jika status sudah 'DIJADWALKAN', data tidak boleh dimanipulasi lagi
        if (oldData.status === "DIJADWALKAN") {
            return {
                success: false,
                error: "Akses Ditolak: Agenda ini sudah masuk dalam tahap penjadwalan dan datanya telah dikunci."
            }
        }

        const updatedUrls: Record<string, string | null> = {}
        const notRequiredFiles = JSON.parse(formData.get("notRequiredFiles") as string || "[]") as string[];

        // 3. Proses File Fields (Upload & Remove)
        for (const field of FILE_FIELDS) {
            const file = formData.get(field) as File
            const deleteFlag = formData.get(`delete_${field}`) === 'true'
            const oldPath = oldData[field as keyof typeof oldData]

            if (file && file.size > 0) {
                // Hapus file lama jika ada sebelum upload yang baru
                if (typeof oldPath === 'string' && oldPath) {
                    await supabase.storage.from('agenda-attachments').remove([oldPath]).catch(() => null)
                }
                const fileExt = file.name.split('.').pop()
                const path = `${user.id}/${Date.now()}-${field}.${fileExt}`
                const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
                updatedUrls[field] = data?.path || null
            } else if (deleteFlag) {
                // Proses hapus file jika flag delete aktif
                if (typeof oldPath === 'string' && oldPath) {
                    await supabase.storage.from('agenda-attachments').remove([oldPath]).catch(() => null)
                }
                updatedUrls[field] = null
            } else {
                // Gunakan path lama jika tidak ada perubahan
                updatedUrls[field] = oldPath as string | null
            }
        }

        // 4. Hitung Status Akhir (Draft atau Dapat Dilanjutkan)
        const allFilesHandled = FILE_FIELDS.every(field =>
            (updatedUrls[field] !== null) || notRequiredFiles.includes(field)
        );

        const finalStatus = allFilesHandled ? "Dapat Dilanjutkan" : "Draft";

        // 5. Eksekusi Update Database
        await db.update(agendas)
            .set({
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
                notRequiredFiles: notRequiredFiles,
                status: finalStatus, // Status tidak akan menjadi 'DIJADWALKAN' dari form usulan
                updatedAt: new Date(),
            })
            .where(eq(agendas.id, id))

        // 6. Revalidasi semua path terkait agar UI sinkron
        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")
        revalidatePath("/jadwal-rapat") // Tambahan revalidate untuk modul jadwal

        return { success: true }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal memperbarui data."
        console.error("Critical Error Update:", errorMessage)
        return { success: false, error: errorMessage }
    }
}

export async function getSignedFileUrl(path: string) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error("Akses ditolak. Silakan login terlebih dahulu.");
    }
    const { data, error } = await supabase.storage
        .from('agenda-attachments')
        .createSignedUrl(path, 15);

    if (error) {
        console.error("Storage Error:", error.message || error);
        return null;
    }
    return data.signedUrl;
}

export async function deleteStorageFile(path: string) {
    const supabase = await createClient()
    try {
        const { error } = await supabase.storage
            .from('agenda-attachments')
            .remove([path])
        if (error) {
            console.error("Gagal menghapus file dari storage:", error.message || error)
            return { success: false }
        }
        return { success: true }
    } catch (err) {
        console.error("Exception deleting storage file:", err)
        return { success: false }
    }
}

export async function resumeAgendaAction(id: string) {
    try {
        await db.update(agendas)
            .set({
                status: "DAPAT_DILANJUTKAN",
                cancellationReason: null, // ✅ Menghapus alasan pembatalan
                updatedAt: new Date()
            })
            .where(eq(agendas.id, id));

        revalidatePath("/agenda-siap/radir");

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal melanjutkan agenda."
        return { success: false, error: errorMessage };
    }
}

export async function scheduleAgendaAction(data: {
    id: string;
    executionDate: string;
    startTime: string;
    endTime: string;
    meetingMethod: string;
    location?: string;
    link?: string;
}) {
    try {
        await db.update(agendas)
            .set({
                executionDate: data.executionDate,
                startTime: data.startTime,
                endTime: data.endTime,
                meetingMethod: data.meetingMethod,
                meetingLocation: data.location,
                meetingLink: data.link,
                status: "DIJADWALKAN",
                updatedAt: new Date(),
            })
            .where(eq(agendas.id, data.id));

        revalidatePath("/jadwal-rapat");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menjadwalkan rapat" };
    }
}

export async function updateScheduledMeetingAction(data: {
    id: string;
    executionDate: string;
    startTime: string;
    endTime: string;
    meetingMethod: string;
    location?: string;
    link?: string;
}) {
    try {
        await db.update(agendas)
            .set({
                executionDate: data.executionDate,
                startTime: data.startTime,
                endTime: data.endTime,
                meetingMethod: data.meetingMethod,
                meetingLocation: data.location,
                meetingLink: data.link,
                updatedAt: new Date(),
            })
            .where(eq(agendas.id, data.id));

        revalidatePath("/jadwal-rapat");
        return { success: true };
    } catch (error) {
        console.error("Update Schedule Error:", error);
        return { success: false, error: "Gagal memperbarui jadwal rapat" };
    }
}

export async function rollbackAgendaAction(id: string) {
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
        return { success: true };
    } catch (error) {
        console.error("Rollback Error:", error);
        return { success: false, error: "Gagal membatalkan jadwal" };
    }
}