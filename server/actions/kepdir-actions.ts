// src/server/actions/kepdir-actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

/**
 * HELPER: Fungsi internal untuk upload file ke Supabase Storage
 */
async function uploadToSupabase(file: File, bucket: string, path: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw new Error(`Upload gagal: ${error.message}`)
    return data.path
}

/**
 * 1. ACTION: CREATE KEPDIR SIRKULER
 * Menangani pembuatan agenda baru beserta upload semua dokumen terkait.
 */
export async function createKepdirAction(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: "Sesi kadaluarsa. Silakan login kembali." }
    }

    try {
        // Daftar semua field file tunggal yang perlu diproses
        const fileFields = [
            "legalReview", "riskReview", "complianceReview", "regulationReview",
            "recommendationNote", "proposalNote", "presentationMaterial",
            "kepdirSirkulerDoc", "grcDoc"
        ] as const

        const uploadedUrls: Record<string, string | null> = {}

        // A. Proses Upload File Tunggal
        for (const field of fileFields) {
            const file = formData.get(field) as File
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop()
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-${field}.${fileExt}`
                uploadedUrls[field] = await uploadToSupabase(file, 'agenda-attachments', path)
            } else {
                uploadedUrls[field] = null
            }
        }

        // B. Proses Upload Multi-files (Supporting Documents)
        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []
        for (const file of supportingFiles) {
            if (file && file.size > 0) {
                const cleanName = file.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-support-${cleanName}`
                const uploadedPath = await uploadToSupabase(file, 'agenda-attachments', path)
                supportingPaths.push(uploadedPath)
            }
        }

        // C. Ambil data teks dari FormData
        const notRequiredFiles = formData.get("notRequiredFiles")
        const parsedNotRequired = notRequiredFiles ? JSON.parse(notRequiredFiles as string) : []

        // D. Insert ke Database (Drizzle)
        await db.insert(agendas).values({
            title: formData.get("title") as string,
            urgency: (formData.get("urgency") as string) || "Normal",
            deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
            priority: (formData.get("priority") as string) || "Low",
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string, // Unit Pendukung
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,

            // File URLs
            legalReview: uploadedUrls.legalReview,
            riskReview: uploadedUrls.riskReview,
            complianceReview: uploadedUrls.complianceReview,
            regulationReview: uploadedUrls.regulationReview,
            recommendationNote: uploadedUrls.recommendationNote,
            proposalNote: uploadedUrls.proposalNote,
            presentationMaterial: uploadedUrls.presentationMaterial,
            kepdirSirkulerDoc: uploadedUrls.kepdirSirkulerDoc,
            grcDoc: uploadedUrls.grcDoc,
            supportingDocuments: supportingPaths, // JSONB Array

            // Metadata & Meeting Info
            status: (formData.get("status") as string) || "DRAFT",
            meetingType: "KEPDIR_SIRKULER",
            notRequiredFiles: parsedNotRequired,

            // Detail Rapat (Jika ada)
            executionDate: formData.get("executionDate") as string || null,
            startTime: formData.get("startTime") as string || null,
            endTime: (formData.get("endTime") as string) || "Selesai",
            meetingMethod: formData.get("meetingMethod") as string || null,
            meetingLocation: formData.get("meetingLocation") as string || null,
            meetingLink: formData.get("meetingLink") as string || null,
        })

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        console.error("Error Create Kepdir:", error)
        return { success: false, error: error instanceof Error ? error.message : "Terjadi kesalahan fatal" }
    }
}

/**
 * 2. ACTION: UPDATE KEPDIR SIRKULER
 * Menangani pembaruan data, penggantian file lama, dan penghapusan file.
 */
export async function updateKepdirAction(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Sesi tidak valid." }

    try {
        const oldData = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!oldData) throw new Error("Data tidak ditemukan")

        const fileFields = [
            "legalReview", "riskReview", "complianceReview", "regulationReview",
            "recommendationNote", "proposalNote", "presentationMaterial",
            "kepdirSirkulerDoc", "grcDoc"
        ] as const

        const updatedUrls: Record<string, string | null> = {}

        for (const field of fileFields) {
            const file = formData.get(field) as File
            const isDeleted = formData.get(`delete_${field}`) === 'true'
            const currentOldPath = oldData[field] as string | null

            if (file && file.size > 0) {
                // Hapus file lama jika ada sebelum ganti baru
                if (currentOldPath) await supabase.storage.from('agenda-attachments').remove([currentOldPath])

                const fileExt = file.name.split('.').pop()
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-${field}.${fileExt}`
                updatedUrls[field] = await uploadToSupabase(file, 'agenda-attachments', path)
            } else if (isDeleted) {
                if (currentOldPath) await supabase.storage.from('agenda-attachments').remove([currentOldPath])
                updatedUrls[field] = null
            } else {
                updatedUrls[field] = currentOldPath
            }
        }

        // Update database
        await db.update(agendas).set({
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
            priority: formData.get("priority") as string,
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,

            // Files
            ...updatedUrls,

            status: formData.get("status") as string || oldData.status,
            cancellationReason: formData.get("cancellationReason") as string || null,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Gagal update data" }
    }
}

/**
 * 3. ACTION: DELETE KEPDIR SIRKULER
 * Membersihkan semua file di Storage sebelum menghapus record database.
 */
export async function deleteKepdirAction(id: string) {
    const supabase = await createClient()
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!existing) throw new Error("Data tidak ditemukan")

        // Kumpulkan semua path file untuk dihapus massal
        const filesToDelete: string[] = []
        const keys = [
            "legalReview", "riskReview", "complianceReview", "regulationReview",
            "recommendationNote", "proposalNote", "presentationMaterial",
            "kepdirSirkulerDoc", "grcDoc"
        ] as const

        keys.forEach(key => { if (existing[key]) filesToDelete.push(existing[key] as string) })

        // Tambahkan supporting documents
        if (existing.supportingDocuments && Array.isArray(existing.supportingDocuments)) {
            filesToDelete.push(...(existing.supportingDocuments as string[]))
        }

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))
        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus data" }
    }
}