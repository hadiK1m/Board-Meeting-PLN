"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

/**
 * 1. ACTION: CREATE KEPDIR SIRKULER
 */
export async function createKepdirAction(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: "Sesi kadaluarsa. Silakan login kembali." }
    }

    try {
        const fileFields = ["kepdirSirkulerDoc", "grcDoc"] as const
        const uploadedUrls: Record<string, string | null> = {}

        // 1. Proses Upload Dokumen Utama
        for (const field of fileFields) {
            const file = formData.get(field) as File
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop()
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-${field}.${fileExt}`
                const { data, error } = await supabase.storage
                    .from('agenda-attachments')
                    .upload(path, file)

                if (error) throw new Error(`Gagal upload ${field}: ${error.message}`)
                uploadedUrls[field] = data.path
            } else {
                uploadedUrls[field] = null
            }
        }

        // 2. Proses Upload Dokumen Pendukung
        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []
        for (const file of supportingFiles) {
            if (file && file.size > 0) {
                const cleanName = file.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-support-${cleanName}`
                const { data } = await supabase.storage
                    .from('agenda-attachments')
                    .upload(path, file)
                if (data) supportingPaths.push(data.path)
            }
        }

        // 3. Insert ke Database
        await db.insert(agendas).values({
            title: formData.get("title") as string,
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            meetingType: "KEPDIR_SIRKULER",
            status: "DRAFT",
            priority: (formData.get("priority") as string) || "Low",

            // --- PERBAIKAN DI SINI ---
            // Database mewajibkan kolom 'urgency', kita beri default "Normal"
            urgency: "Normal",
            // -------------------------

            kepdirSirkulerDoc: uploadedUrls.kepdirSirkulerDoc,
            grcDoc: uploadedUrls.grcDoc,
            support: JSON.stringify(supportingPaths),
            notRequiredFiles: JSON.stringify([]),
        })

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        console.error("Error Create Kepdir:", error)
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan internal"
        return { success: false, error: errorMessage }
    }
}

/**
 * 2. ACTION: UPDATE KEPDIR SIRKULER
 */
export async function updateKepdirAction(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Sesi tidak valid." }

    try {
        const oldData = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!oldData) throw new Error("Data tidak ditemukan")

        const fileFields = ["kepdirSirkulerDoc", "grcDoc"] as const
        const updatedUrls: Record<string, string | null> = {}

        for (const field of fileFields) {
            const file = formData.get(field) as File
            const deleteFlag = formData.get(`delete_${field}`) === 'true'
            const oldPath = oldData[field as keyof typeof oldData] as string | null

            if (file && file.size > 0) {
                if (oldPath) await supabase.storage.from('agenda-attachments').remove([oldPath])
                const fileExt = file.name.split('.').pop()
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-${field}.${fileExt}`
                const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
                updatedUrls[field] = data?.path || null
            } else if (deleteFlag) {
                if (oldPath) await supabase.storage.from('agenda-attachments').remove([oldPath])
                updatedUrls[field] = null
            } else {
                updatedUrls[field] = oldPath
            }
        }

        await db.update(agendas).set({
            title: formData.get("title") as string,
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            kepdirSirkulerDoc: updatedUrls.kepdirSirkulerDoc,
            grcDoc: updatedUrls.grcDoc,

            // --- Opsional: Pastikan urgency tidak hilang saat update ---
            // urgency: "Normal", 

            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan update"
        return { success: false, error: errorMessage }
    }
}

/**
 * 3. ACTION: DELETE KEPDIR SIRKULER
 */
export async function deleteKepdirAction(id: string) {
    const supabase = await createClient()
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!existing) throw new Error("Data tidak ditemukan")

        const filesToDelete: string[] = []
        if (existing.kepdirSirkulerDoc) filesToDelete.push(existing.kepdirSirkulerDoc)
        if (existing.grcDoc) filesToDelete.push(existing.grcDoc)

        if (existing.support) {
            try {
                let supportDocs: string[] = []
                if (typeof existing.support === 'string') {
                    supportDocs = JSON.parse(existing.support)
                } else if (Array.isArray(existing.support)) {
                    supportDocs = existing.support as string[]
                }

                if (supportDocs.length > 0) {
                    filesToDelete.push(...supportDocs)
                }
            } catch (e) {
                console.error("Gagal parsing support docs saat delete:", e)
            }
        }

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))
        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan hapus"
        return { success: false, error: errorMessage }
    }
}