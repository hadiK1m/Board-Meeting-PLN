/* eslint-disable @typescript-eslint/no-unused-vars */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

/**
 * HELPER: Upload file ke bucket 'agenda-attachments'
 */
async function uploadToStorage(file: File, folder: string, userId: string): Promise<string | null> {
    if (!file || file.size === 0) return null

    try {
        const supabase = await createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${folder}.${fileExt}`
        const bucketId = "agenda-attachments"
        const path = `rakordir/${userId}/${randomUUID()}/${fileName}`

        const { data, error } = await supabase.storage
            .from(bucketId)
            .upload(path, file)

        if (error) {
            console.error(`[STORAGE-ERROR] Gagal upload ${folder}:`, error.message)
            return null
        }
        return data.path
    } catch (error) {
        console.error(`[STORAGE-CRITICAL] Exception pada upload ${folder}:`, error)
        return null
    }
}

/**
 * HELPER: Hapus file dari storage
 */
async function deleteFromStorage(paths: string[]) {
    const validPaths = paths.filter(p => p && p !== "" && p !== "null")
    if (validPaths.length === 0) return

    try {
        const supabase = await createClient()
        await supabase.storage.from("agenda-attachments").remove(validPaths)
    } catch (error) {
        console.error("[STORAGE-DELETE-ERROR]:", error)
    }
}

/**
 * 1. ACTION: CREATE RAKORDIR
 */
export async function createRakordirAction(formData: FormData) {
    try {
        const userId = "admin"; // Sesuaikan dengan session user jika ada

        // Upload Single Files
        const proposalNoteFile = formData.get("proposalNote") as File
        const presentationMaterialFile = formData.get("presentationMaterial") as File

        const proposalNotePath = await uploadToStorage(proposalNoteFile, "proposal", userId)
        const presentationMaterialPath = await uploadToStorage(presentationMaterialFile, "presentation", userId)

        // Upload Multiple Supporting Documents
        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []
        for (const file of supportingFiles) {
            const path = await uploadToStorage(file, "supporting", userId)
            if (path) supportingPaths.push(path)
        }

        // Ambil data teks
        const title = formData.get("title") as string
        const urgency = formData.get("urgency") as string
        const deadline = formData.get("deadline") as string
        const priority = formData.get("priority") as string
        const initiator = formData.get("initiator") as string
        const contactPerson = formData.get("contactPerson") as string
        const position = formData.get("position") as string
        const phone = formData.get("phone") as string
        const isComplete = formData.get("isComplete") === "true"

        // Handle JSON Fields (Multi-select)
        const director = formData.get("director") as string // Sudah di-stringify dari client
        const support = formData.get("support") as string   // Sudah di-stringify dari client
        const notRequiredFiles = formData.get("notRequiredFiles") as string

        await db.insert(agendas).values({
            id: randomUUID(),
            meetingType: "RAKORDIR",
            title,
            urgency,
            deadline: deadline ? new Date(deadline) : null,
            priority,
            initiator,
            director, // Simpan sebagai string JSON
            support,  // Simpan sebagai string JSON
            contactPerson,
            position,
            phone,
            proposalNote: proposalNotePath,
            presentationMaterial: presentationMaterialPath,
            supportingDocuments: JSON.stringify(supportingPaths),
            notRequiredFiles,
            status: isComplete ? "SIAP_SIDANG" : "DRAFT",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal membuat agenda"
        console.error("[ACTION-CREATE-ERROR]:", msg)
        return { success: false, error: msg }
    }
}

/**
 * 2. ACTION: UPDATE RAKORDIR
 */
export async function updateRakordirAction(id: string, formData: FormData) {
    try {
        const userId = "admin"
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!existing) throw new Error("Agenda tidak ditemukan")

        // Handle File Proposal Note
        let proposalNotePath = existing.proposalNote
        const newProposalFile = formData.get("proposalNote") as File
        if (newProposalFile && newProposalFile.size > 0) {
            if (existing.proposalNote) await deleteFromStorage([existing.proposalNote])
            proposalNotePath = await uploadToStorage(newProposalFile, "proposal", userId)
        }

        // Handle File Presentation
        let presentationMaterialPath = existing.presentationMaterial
        const newPresentationFile = formData.get("presentationMaterial") as File
        if (newPresentationFile && newPresentationFile.size > 0) {
            if (existing.presentationMaterial) await deleteFromStorage([existing.presentationMaterial])
            presentationMaterialPath = await uploadToStorage(newPresentationFile, "presentation", userId)
        }

        // Handle Supporting Documents (Append/Replace logic)
        const newSupportingFiles = formData.getAll("supportingDocuments") as File[]
        let currentSupporting: string[] = []
        try {
            currentSupporting = JSON.parse(existing.supportingDocuments as string || "[]")
        } catch {
            currentSupporting = []
        }

        for (const file of newSupportingFiles) {
            const path = await uploadToStorage(file, "supporting", userId)
            if (path) currentSupporting.push(path)
        }

        // Data Update
        const isComplete = formData.get("isComplete") === "true"
        const finalStatus = isComplete ? "SIAP_SIDANG" : "DRAFT"

        await db.update(agendas).set({
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
            priority: formData.get("priority") as string,
            initiator: formData.get("initiator") as string,
            director: formData.get("director") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            proposalNote: proposalNotePath,
            presentationMaterial: presentationMaterialPath,
            supportingDocuments: JSON.stringify(currentSupporting),
            notRequiredFiles: formData.get("notRequiredFiles") as string,
            status: finalStatus,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal update agenda"
        console.error("[ACTION-UPDATE-ERROR]:", msg)
        return { success: false, error: msg }
    }
}

/**
 * 3. ACTION: DELETE RAKORDIR
 */
export async function deleteRakordirAction(id: string) {
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!existing) throw new Error("Agenda tidak ditemukan")

        const filesToDelete: string[] = []
        if (existing.proposalNote) filesToDelete.push(existing.proposalNote)
        if (existing.presentationMaterial) filesToDelete.push(existing.presentationMaterial)

        // Parse supporting documents jika ada
        if (existing.supportingDocuments) {
            try {
                const supporting = JSON.parse(existing.supportingDocuments as string)
                if (Array.isArray(supporting)) filesToDelete.push(...supporting)
            } catch (e) { /* ignore */ }
        }

        if (filesToDelete.length > 0) await deleteFromStorage(filesToDelete)

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        console.error("[ACTION-DELETE-ERROR]:", error)
        return { success: false, error: "Gagal menghapus agenda" }
    }
}