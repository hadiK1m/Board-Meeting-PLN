// src/server/actions/kepdir-actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

/**
 * HELPER: Membersihkan nilai dengan tipe data yang aman (Menghilangkan error 'any')
 */
function cleanValue<T>(val: T, fallback: T): T {
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        return fallback
    }
    return val
}

export async function createKepdirAction(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: "Sesi kadaluarsa. Silakan login kembali." }
    }

    try {
        const fileFields = ["kepdirSirkulerDoc", "grcDoc"] as const
        const uploadedUrls: Record<string, string | null> = {}

        for (const field of fileFields) {
            const file = formData.get(field) as File
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop()
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-${field}.${fileExt}`
                const { data, error } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (error) throw new Error(`Gagal upload ${field}`)
                uploadedUrls[field] = data.path
            } else {
                uploadedUrls[field] = null
            }
        }

        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []
        for (const file of supportingFiles) {
            if (file && file.size > 0) {
                const path = `kepdir-sirkuler/${user.id}/${Date.now()}-support-${file.name.replace(/\s/g, '_')}`
                const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (data) supportingPaths.push(data.path)
            }
        }

        // INSERT DATABASE
        await db.insert(agendas).values({
            title: formData.get("title") as string,
            director: cleanValue(formData.get("director") as string, "DIRUT"),
            initiator: cleanValue(formData.get("initiator") as string, "PLN"),
            support: "", // ✅ FIX: Memberikan string kosong agar TS tidak komplain 'Property support is missing'
            contactPerson: cleanValue(formData.get("contactPerson") as string, "N/A"),
            position: cleanValue(formData.get("position") as string, "Staff"),
            phone: cleanValue(formData.get("phone") as string, "0"),
            meetingType: "KEPDIR_SIRKULER",
            status: cleanValue(formData.get("status") as string, "DRAFT"),
            priority: "Low",
            urgency: "Normal",
            deadline: null,
            kepdirSirkulerDoc: uploadedUrls.kepdirSirkulerDoc,
            grcDoc: uploadedUrls.grcDoc,
            supportingDocuments: supportingPaths,
            notRequiredFiles: [],
        })

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        console.error("Create Kepdir Error:", error)
        return { success: false, error: "Gagal membuat agenda kepdir" }
    }
}

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
            const oldPath = (oldData as Record<string, any>)[field] as string | null

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
            director: cleanValue(formData.get("director") as string, oldData.director),
            initiator: cleanValue(formData.get("initiator") as string, oldData.initiator),
            contactPerson: cleanValue(formData.get("contactPerson") as string, oldData.contactPerson),
            position: cleanValue(formData.get("position") as string, oldData.position),
            phone: cleanValue(formData.get("phone") as string, oldData.phone),
            status: cleanValue(formData.get("status") as string, oldData.status),
            kepdirSirkulerDoc: updatedUrls.kepdirSirkulerDoc,
            grcDoc: updatedUrls.grcDoc,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error) {
        console.error("Update Kepdir Error:", error)
        return { success: false, error: "Terjadi kesalahan saat memperbarui data" }
    }
}

export async function deleteKepdirAction(id: string) {
    const supabase = await createClient()
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!existing) throw new Error("Data tidak ditemukan")

        const filesToDelete: string[] = []
        if (existing.kepdirSirkulerDoc) filesToDelete.push(existing.kepdirSirkulerDoc)
        if (existing.grcDoc) filesToDelete.push(existing.grcDoc)

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))
        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch {
        // ✅ FIX: Menghapus variabel 'error' yang tidak digunakan
        return { success: false, error: "Gagal menghapus agenda" }
    }
}