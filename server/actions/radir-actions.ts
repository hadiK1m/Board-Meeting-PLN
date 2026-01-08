"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas, Agenda } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

// ✅ Type-safety: Menggunakan inferensi tipe dari Drizzle Schema
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

/**
 * HELPER: Membersihkan nilai dengan tipe data yang aman
 */
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: "Sesi kadaluarsa. Silakan login kembali." }
    }

    try {
        const uploadedUrls: Partial<Record<AgendaFileField, string | null>> = {}

        // ✅ Ambil status tombol dan parse menjadi array asli
        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : []

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

        // Cek kelengkapan dokumen
        const allFilesHandled = FILE_FIELDS.every(field =>
            (uploadedUrls[field] !== null) || (Array.isArray(notRequiredFiles) && notRequiredFiles.includes(field))
        );

        const insertData: NewAgenda = {
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: cleanValue(formData.get("priority") as string, "Low"),
            deadline: new Date(formData.get("deadline") as string),
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
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan data."
        return { success: false, error: msg }
    }
}

/**
 * 2. ACTION: Update Agenda (RADIR)
 */
export async function updateRadirAction(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Sesi kadaluarsa." }

    try {
        const oldData = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!oldData) return { success: false, error: "Data tidak ditemukan." }

        const updatedUrls: Partial<Record<AgendaFileField, string | null>> = {}
        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : oldData.notRequiredFiles

        for (const field of FILE_FIELDS) {
            const file = formData.get(field) as File
            const deleteFlag = formData.get(`delete_${field}`) === 'true'

            // ✅ Fix type casting ESLint
            const oldPath = (oldData as Agenda)[field as keyof Agenda]

            if (file && file.size > 0) {
                if (typeof oldPath === 'string') await supabase.storage.from('agenda-attachments').remove([oldPath])
                const fileExt = file.name.split('.').pop()
                const path = `radir/${user.id}/${Date.now()}-${field}.${fileExt}`
                const { data, error } = await supabase.storage.from('agenda-attachments').upload(path, file)
                if (error) throw error
                updatedUrls[field] = data?.path || null
            } else if (deleteFlag) {
                if (typeof oldPath === 'string') await supabase.storage.from('agenda-attachments').remove([oldPath])
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
            deadline: new Date(formData.get("deadline") as string),
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
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Error update"
        return { success: false, error: msg }
    }
}

/**
 * 3. ACTION: Delete Agenda (RADIR)
 */
export async function deleteRadirAction(id: string) {
    const supabase = await createClient()
    try {
        const dataAgenda = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!dataAgenda) return { success: false, error: "Data tidak ditemukan." }

        const filesToDelete: string[] = []
        FILE_FIELDS.forEach(field => {
            const path = dataAgenda[field as keyof typeof dataAgenda]
            if (typeof path === 'string' && path) filesToDelete.push(path)
        })

        if (dataAgenda.supportingDocuments) {
            const extra = typeof dataAgenda.supportingDocuments === 'string'
                ? JSON.parse(dataAgenda.supportingDocuments)
                : dataAgenda.supportingDocuments
            if (Array.isArray(extra)) filesToDelete.push(...extra.map(String))
        }

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))
        revalidatePath("/agenda/radir")
        return { success: true }
    } catch {
        return { success: false, error: "Gagal menghapus data." }
    }
}