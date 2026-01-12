/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

// ✅ Type-safety
type NewAgenda = typeof agendas.$inferInsert;
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ✅ Daftar tipe file yang diizinkan (White-listing)
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint", // .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "text/plain",
    "image/jpeg",
    "image/png"
];

// --- HELPER: AUTH GUARD ---
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Anda harus login untuk akses ini.")
    }
    return { user, supabase }
}

// --- HELPER: VALIDATE FILE ---
function validateFile(file: File) {
    // 1. Cek Ukuran
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} terlalu besar (Maks 50MB).`)
    }

    // 2. Cek Tipe File (Menggunakan ALLOWED_MIME_TYPES)
    // ✅ Fix: Variabel ini sekarang digunakan untuk keamanan!
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Format file ${file.name} tidak valid. Gunakan PDF, Office Doc, atau Gambar.`)
    }
}

function cleanValue<T>(val: T, fallback: T): T {
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        return fallback
    }
    return val
}

/**
 * 1. ACTION: Create Agenda (RADIR)
 */
export async function createRadirAction(formData: FormData) {
    try {
        // [SECURE] 1. Auth Check
        const { user, supabase } = await assertAuthenticated()

        const uploadedUrls: Partial<Record<AgendaFileField, string | null>> = {}
        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : []

        // Upload Dokumen Utama
        for (const field of FILE_FIELDS) {
            const file = formData.get(field) as File
            if (file && file.size > 0) {
                validateFile(file)
                const fileExt = file.name.split('.').pop()
                // [SECURE] Gunakan UUID
                const uniqueId = crypto.randomUUID()
                const path = `radir/${user.id}/${uniqueId}-${field}.${fileExt}`

                const { data, error } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (error) throw error
                uploadedUrls[field] = data.path
            } else {
                uploadedUrls[field] = null
            }
        }

        // Upload Dokumen Pendukung
        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []

        for (const file of supportingFiles) {
            if (file && file.size > 0 && file.name !== 'undefined') {
                validateFile(file)
                const uniqueId = crypto.randomUUID()
                // Sanitasi nama file
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const path = `radir/${user.id}/${uniqueId}-${cleanName}`

                const { data, error: uploadError } = await supabase.storage
                    .from('agenda-attachments')
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    console.error(`[STORAGE-ERROR] Gagal unggah dokumen pendukung:`, uploadError.message)
                    continue
                }
                if (data) supportingPaths.push(data.path)
            }
        }

        // Logic Status
        const allFilesHandled = FILE_FIELDS.every(field =>
            (uploadedUrls[field] !== null) || (Array.isArray(notRequiredFiles) && notRequiredFiles.includes(field))
        );

        const insertData: NewAgenda = {
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: cleanValue(formData.get("priority") as string, "Low"),
            deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
            director: cleanValue(formData.get("director") as string, "DIRUT"),
            initiator: cleanValue(formData.get("initiator") as string, "PLN"),
            support: formData.get("support") as string || "",
            contactPerson: cleanValue(formData.get("contactPerson") as string, "N/A"),
            position: cleanValue(formData.get("position") as string, "Staff"),
            phone: cleanValue(formData.get("phone") as string, "0"),
            ...uploadedUrls,
            supportingDocuments: supportingPaths,
            notRequiredFiles: notRequiredFiles,
            status: allFilesHandled ? "DAPAT_DILANJUTKAN" : "DRAFT",
            meetingType: "RADIR",
        };

        await db.insert(agendas).values(insertData);
        revalidatePath("/agenda/radir")
        return { success: true }

    } catch (error: any) {
        console.error("Create Radir Error:", error)
        return { success: false, error: error.message || "Gagal menyimpan data." }
    }
}

/**
 * 2. ACTION: Update Agenda (RADIR)
 */
export async function updateRadirAction(id: string, formData: FormData) {
    try {
        // [SECURE] Auth Check
        const { user, supabase } = await assertAuthenticated()

        const oldData = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!oldData) return { success: false, error: "Data tidak ditemukan." }

        if (oldData.status === "DIJADWALKAN" || oldData.status === "SELESAI_SIDANG") {
            return { success: false, error: "Agenda sudah dikunci." }
        }

        const updatedUrls: Partial<Record<AgendaFileField, string | null>> = {}
        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : oldData.notRequiredFiles

        for (const field of FILE_FIELDS) {
            const file = formData.get(field) as File
            const deleteFlag = formData.get(`delete_${field}`) === 'true'
            const oldPath = (oldData as any)[field]

            if (file && file.size > 0) {
                validateFile(file)
                if (typeof oldPath === 'string' && oldPath) {
                    await supabase.storage.from('agenda-attachments').remove([oldPath])
                }

                const fileExt = file.name.split('.').pop()
                const uniqueId = crypto.randomUUID()
                const path = `radir/${user.id}/${uniqueId}-${field}.${fileExt}`

                const { data, error } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (error) throw error
                updatedUrls[field] = data?.path || null
            } else if (deleteFlag) {
                if (typeof oldPath === 'string' && oldPath) {
                    await supabase.storage.from('agenda-attachments').remove([oldPath])
                }
                updatedUrls[field] = null
            } else {
                updatedUrls[field] = oldPath as string | null
            }
        }

        const allFilesHandled = FILE_FIELDS.every(field =>
            (updatedUrls[field] !== null) || (Array.isArray(notRequiredFiles) && notRequiredFiles.includes(field))
        );

        await db.update(agendas).set({
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: cleanValue(formData.get("priority") as string, oldData.priority),
            deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : oldData.deadline,
            director: cleanValue(formData.get("director") as string, oldData.director),
            initiator: cleanValue(formData.get("initiator") as string, oldData.initiator),
            support: formData.get("support") as string || "",
            contactPerson: cleanValue(formData.get("contactPerson") as string, oldData.contactPerson),
            position: cleanValue(formData.get("position") as string, oldData.position),
            phone: cleanValue(formData.get("phone") as string, oldData.phone),
            ...updatedUrls,
            notRequiredFiles: notRequiredFiles,
            status: allFilesHandled ? "DAPAT_DILANJUTKAN" : "DRAFT",
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || "Gagal update data." }
    }
}

/**
 * 3. ACTION: Delete Agenda (RADIR)
 */
export async function deleteRadirAction(id: string) {
    try {
        // [SECURE] Auth Check
        const { supabase } = await assertAuthenticated()

        const dataAgenda = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!dataAgenda) return { success: false, error: "Data tidak ditemukan." }

        const filesToDelete: string[] = []
        FILE_FIELDS.forEach(field => {
            const path = (dataAgenda as any)[field]
            if (typeof path === 'string' && path) filesToDelete.push(path)
        })

        if (dataAgenda.supportingDocuments) {
            try {
                const extra = Array.isArray(dataAgenda.supportingDocuments)
                    ? dataAgenda.supportingDocuments
                    : JSON.parse(dataAgenda.supportingDocuments as string || "[]")
                if (Array.isArray(extra)) filesToDelete.push(...extra.map(String))
            } catch {
                // ✅ Fix: Menghapus variabel (e) yang tidak digunakan
            }
        }

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || "Gagal menghapus data." }
    }
}

/**
 * Upload Risalah Final
 */
export async function uploadRisalahTtdAction(agendaId: string, formData: FormData) {
    try {
        // [SECURE] Auth Check
        const { supabase } = await assertAuthenticated()

        const file = formData.get("file") as File
        if (!file) throw new Error("File tidak ditemukan")

        // 1. Validasi Tipe File (PDF Only)
        if (file.type !== "application/pdf") {
            return { success: false, error: "Hanya file PDF yang diperbolehkan." }
        }

        // 2. Generate File Name & Path
        const uniqueId = crypto.randomUUID()
        const fileName = `risalah-final/${agendaId}_${uniqueId}.pdf`

        const { error: uploadError } = await supabase.storage
            .from("agenda-attachments")
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: true,
            })

        if (uploadError) throw new Error(uploadError.message)

        await db
            .update(agendas)
            .set({ risalahTtd: fileName })
            .where(eq(agendas.id, agendaId))

        revalidatePath("/pelaksanaan-rapat/radir")
        return { success: true, message: "Risalah Final berhasil diunggah" }
    } catch (error: any) {
        console.error("Upload Risalah Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Get Download URL Risalah
 */
export async function getRisalahDownloadUrlAction(filePath: string) {
    try {
        // [SECURE] Auth Check
        const { supabase } = await assertAuthenticated()

        const { data, error } = await supabase.storage
            .from("agenda-attachments")
            .createSignedUrl(filePath, 3600)

        if (error) throw new Error(error.message)
        return { success: true, url: data.signedUrl }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Delete Risalah Final
 */
export async function deleteRisalahTtdAction(agendaId: string, filePath: string) {
    try {
        // [SECURE] Auth Check
        const { supabase } = await assertAuthenticated()

        const { error: storageError } = await supabase.storage
            .from("agenda-attachments")
            .remove([filePath])

        if (storageError) throw new Error(storageError.message)

        await db
            .update(agendas)
            .set({ risalahTtd: null })
            .where(eq(agendas.id, agendaId))

        revalidatePath("/pelaksanaan-rapat/radir")
        return { success: true, message: "Risalah berhasil dihapus" }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}