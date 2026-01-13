"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

// --- KONFIGURASI KEAMANAN FILE ---
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation" // .pptx
];

// --- HELPER: VALIDASI AUTH & ROLE ---
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Akses Ditolak: Anda harus login.")
    }
    return { user, supabase }
}

// --- HELPER: VALIDASI FILE ---
function validateFile(file: File, fieldName: string) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${fieldName} terlalu besar (Maks 10MB).`)
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Format file ${fieldName} tidak didukung. Harap upload PDF atau Office Doc.`)
    }
}

// --- HELPER: SANITIZE FILENAME ---
function generateSafePath(userId: string, folder: string, fileName: string) {
    const ext = fileName.split('.').pop()
    const uniqueId = crypto.randomUUID() // UUID agar nama file tidak bisa ditebak
    return `${folder}/${userId}/${uniqueId}.${ext}`
}

/**
 * 1. ACTION: CREATE KEPDIR SIRKULER
 */
export async function createKepdirAction(formData: FormData) {
    try {
        const { user, supabase } = await assertAuthenticated()

        // 1. Upload Logic yang Aman
        const uploadedUrls: Record<string, string | null> = {}
        const fileFields = ["kepdirSirkulerDoc", "grcDoc"] as const

        for (const field of fileFields) {
            const file = formData.get(field) as File
            if (file && file.size > 0) {
                validateFile(file, field)

                const path = generateSafePath(user.id, "kepdir-sirkuler", file.name)
                const { data, error } = await supabase.storage.from('agenda-attachments').upload(path, file)

                if (error) throw new Error(`Gagal upload ${field}: ${error.message}`)
                uploadedUrls[field] = data.path
            } else {
                uploadedUrls[field] = null
            }
        }

        // Upload Supporting Docs
        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []

        for (const file of supportingFiles) {
            if (file && file.size > 0) {
                validateFile(file, "Dokumen Pendukung")
                const path = generateSafePath(user.id, "kepdir-sirkuler/support", file.name)
                const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (data) supportingPaths.push(data.path)
            }
        }

        // Parse & Defaulting Values
        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : []

        await db.insert(agendas).values({
            title: (formData.get("title") as string) || "Tanpa Judul",
            director: (formData.get("director") as string) || "DIRUT",
            initiator: (formData.get("initiator") as string) || "PLN",
            meetingType: "KEPDIR_SIRKULER",
            status: (formData.get("status") as string) || "DRAFT",

            // Field default yang aman
            priority: "Low",
            urgency: "Normal",
            support: "",
            contactPerson: (formData.get("contactPerson") as string) || "",
            position: (formData.get("position") as string) || "",
            phone: (formData.get("phone") as string) || "",

            kepdirSirkulerDoc: uploadedUrls.kepdirSirkulerDoc,
            grcDoc: uploadedUrls.grcDoc,
            supportingDocuments: supportingPaths,
            notRequiredFiles: notRequiredFiles,

            // Audit Trail
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Gagal membuat agenda."
        console.error("[CREATE_KEPDIR_ERROR]:", message)
        return { success: false, error: message }
    }
}

/**
 * 2. ACTION: UPDATE KEPDIR SIRKULER
 */
export async function updateKepdirAction(id: string, formData: FormData) {
    try {
        const { user, supabase } = await assertAuthenticated()

        const oldData = await db.query.agendas.findFirst({
            where: eq(agendas.id, id)
        })
        if (!oldData) throw new Error("Data agenda tidak ditemukan.")

        // Logic File Handling
        const fileFields = ["kepdirSirkulerDoc", "grcDoc"] as const
        const updatedUrls: Record<string, string | null> = {}

        for (const field of fileFields) {
            const file = formData.get(field) as File
            const deleteFlag = formData.get(`delete_${field}`) === 'true'
            const oldPath = oldData[field] as string | null

            if (file && file.size > 0) {
                validateFile(file, field)
                if (oldPath) await supabase.storage.from('agenda-attachments').remove([oldPath])

                const path = generateSafePath(user.id, "kepdir-sirkuler", file.name)
                const { data, error } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (error) throw error
                updatedUrls[field] = data?.path || null
            } else if (deleteFlag) {
                if (oldPath) await supabase.storage.from('agenda-attachments').remove([oldPath])
                updatedUrls[field] = null
            } else {
                updatedUrls[field] = oldPath
            }
        }

        // Handling Supporting Docs (Append Only logic + cleanup if needed)
        const newSupportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = Array.isArray(oldData.supportingDocuments)
            ? [...(oldData.supportingDocuments as string[])]
            : []

        for (const file of newSupportingFiles) {
            if (file && file.size > 0) {
                validateFile(file, "Dokumen Pendukung")
                const path = generateSafePath(user.id, "kepdir-sirkuler/support", file.name)
                const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (data) supportingPaths.push(data.path)
            }
        }

        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : oldData.notRequiredFiles

        await db.update(agendas).set({
            title: formData.get("title") as string,
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            status: formData.get("status") as string,
            kepdirSirkulerDoc: updatedUrls.kepdirSirkulerDoc,
            grcDoc: updatedUrls.grcDoc,
            supportingDocuments: supportingPaths,
            notRequiredFiles: notRequiredFiles,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Gagal update agenda."
        console.error("[UPDATE_KEPDIR_ERROR]:", message)
        return { success: false, error: message }
    }
}

/**
 * 3. ACTION: DELETE KEPDIR SIRKULER
 */
export async function deleteKepdirAction(id: string) {
    try {
        const { supabase } = await assertAuthenticated()

        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!existing) throw new Error("Data tidak ditemukan")

        // Bersihkan Storage
        const filesToDelete: string[] = []
        if (existing.kepdirSirkulerDoc) filesToDelete.push(existing.kepdirSirkulerDoc)
        if (existing.grcDoc) filesToDelete.push(existing.grcDoc)
        if (Array.isArray(existing.supportingDocuments)) {
            filesToDelete.push(...(existing.supportingDocuments as string[]))
        }

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/kepdir-sirkuler")
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Gagal menghapus data."
        console.error("[DELETE_KEPDIR_ERROR]:", message)
        return { success: false, error: message }
    }
}