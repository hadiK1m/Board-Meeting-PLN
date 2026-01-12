/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

/**
 * ======================================================
 * HELPER: Upload file ke bucket 'agenda-attachments'
 * ======================================================
 */
async function uploadToStorage(
    file: File,
    folder: string,
    userId: string
): Promise<string | null> {
    if (!file || file.size === 0) return null

    try {
        const supabase = await createClient()
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${folder}.${fileExt}`
        const path = `rakordir/${userId}/${randomUUID()}/${fileName}`

        const { data, error } = await supabase.storage
            .from("agenda-attachments")
            .upload(path, file)

        if (error) {
            console.error(`[STORAGE-UPLOAD-ERROR] ${folder}:`, error.message)
            return null
        }

        return data.path
    } catch (error) {
        console.error("[STORAGE-UPLOAD-CRITICAL]:", error)
        return null
    }
}

/**
 * ======================================================
 * HELPER: Hapus file dari storage
 * ======================================================
 */
async function deleteFromStorage(paths: string[]) {
    const validPaths = paths.filter(p => p && p !== "" && p !== "null")
    if (validPaths.length === 0) return

    try {
        const supabase = await createClient()
        await supabase.storage
            .from("agenda-attachments")
            .remove(validPaths)
    } catch (error) {
        console.error("[STORAGE-DELETE-ERROR]:", error)
    }
}

/**
 * ======================================================
 * 1. ACTION: CREATE RAKORDIR
 * ======================================================
 */
export async function createRakordirAction(formData: FormData) {
    try {
        const userId = "admin" // ganti dengan session jika sudah ada

        // 🔑 ACTION TYPE
        const actionType = formData.get("actionType")
        const status =
            actionType === "submit"
                ? "DAPAT_DILANJUTKAN"
                : "DRAFT"

        // Upload file utama
        const proposalNoteFile = formData.get("proposalNote") as File
        const presentationMaterialFile = formData.get("presentationMaterial") as File

        const proposalNotePath = await uploadToStorage(
            proposalNoteFile,
            "proposal",
            userId
        )
        const presentationMaterialPath = await uploadToStorage(
            presentationMaterialFile,
            "presentation",
            userId
        )

        // Upload supporting documents
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

        // JSON / stringified fields
        const director = formData.get("director") as string
        const support = formData.get("support") as string
        const notRequiredFiles = formData.get("notRequiredFiles") as string

        await db.insert(agendas).values({
            id: randomUUID(),
            meetingType: "RAKORDIR",
            title,
            urgency,
            deadline: deadline ? new Date(deadline) : null,
            priority,
            initiator,
            director,
            support,
            contactPerson,
            position,
            phone,
            proposalNote: proposalNotePath,
            presentationMaterial: presentationMaterialPath,
            supportingDocuments: JSON.stringify(supportingPaths),
            notRequiredFiles,
            status, // ✅ DIKONTROL ACTION TYPE
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        const msg =
            error instanceof Error
                ? error.message
                : "Gagal membuat agenda Rakordir"
        console.error("[ACTION-CREATE-ERROR]:", msg)
        return { success: false, error: msg }
    }
}

/**
 * ======================================================
 * 2. ACTION: UPDATE RAKORDIR
 * ======================================================
 */
export async function updateRakordirAction(id: string, formData: FormData) {
    try {
        const userId = "admin"
        const existing = await db.query.agendas.findFirst({
            where: eq(agendas.id, id),
        })

        if (!existing) throw new Error("Agenda tidak ditemukan")

        // 🔑 ACTION TYPE
        const actionType = formData.get("actionType")

        // Proposal Note
        let proposalNotePath = existing.proposalNote
        const newProposalFile = formData.get("proposalNote") as File
        if (newProposalFile && newProposalFile.size > 0) {
            if (existing.proposalNote) {
                await deleteFromStorage([existing.proposalNote])
            }
            proposalNotePath = await uploadToStorage(
                newProposalFile,
                "proposal",
                userId
            )
        }

        // Presentation Material
        let presentationMaterialPath = existing.presentationMaterial
        const newPresentationFile = formData.get("presentationMaterial") as File
        if (newPresentationFile && newPresentationFile.size > 0) {
            if (existing.presentationMaterial) {
                await deleteFromStorage([existing.presentationMaterial])
            }
            presentationMaterialPath = await uploadToStorage(
                newPresentationFile,
                "presentation",
                userId
            )
        }

        // Supporting Documents
        let currentSupporting: string[] = []
        try {
            currentSupporting = JSON.parse(
                (existing.supportingDocuments as string) || "[]"
            )
        } catch {
            currentSupporting = []
        }

        const newSupportingFiles = formData.getAll(
            "supportingDocuments"
        ) as File[]
        for (const file of newSupportingFiles) {
            const path = await uploadToStorage(file, "supporting", userId)
            if (path) currentSupporting.push(path)
        }

        // DATA UPDATE
        const updateData: Record<string, any> = {
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            deadline: formData.get("deadline")
                ? new Date(formData.get("deadline") as string)
                : null,
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
            updatedAt: new Date(),
        }

        // 🔁 STATUS TRANSISI
        if (actionType === "submit") {
            updateData.status = "DAPAT_DILANJUTKAN"
        } else if (actionType === "draft") {
            updateData.status = "DRAFT"
        }

        await db.update(agendas)
            .set(updateData)
            .where(eq(agendas.id, id))

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        const msg =
            error instanceof Error
                ? error.message
                : "Gagal update agenda Rakordir"
        console.error("[ACTION-UPDATE-ERROR]:", msg)
        return { success: false, error: msg }
    }
}

/**
 * ======================================================
 * 3. ACTION: DELETE RAKORDIR
 * ======================================================
 */
export async function deleteRakordirAction(id: string) {
    try {
        const existing = await db.query.agendas.findFirst({
            where: eq(agendas.id, id),
        })
        if (!existing) throw new Error("Agenda tidak ditemukan")

        const filesToDelete: string[] = []

        if (existing.proposalNote) filesToDelete.push(existing.proposalNote)
        if (existing.presentationMaterial)
            filesToDelete.push(existing.presentationMaterial)

        if (existing.supportingDocuments) {
            try {
                const supporting = JSON.parse(
                    existing.supportingDocuments as string
                )
                if (Array.isArray(supporting)) {
                    filesToDelete.push(...supporting)
                }
            } catch {
                /* ignore */
            }
        }

        if (filesToDelete.length > 0) {
            await deleteFromStorage(filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        console.error("[ACTION-DELETE-ERROR]:", error)
        return { success: false, error: "Gagal menghapus agenda" }
    }
}

/**
 * ======================================================
 * 4. ACTION: UPDATE RAKORDIR (LIVE / PELAKSANAAN)
 * ======================================================
 */
export async function updateRakordirLiveAction(payloads: any[]) {
    try {
        await db.transaction(async (tx) => {
            for (const data of payloads) {
                // 1. Ambil Arahan Direksi dari Payload
                // Pastikan formatnya array object { id, text }
                const listArahan = Array.isArray(data.arahanDireksi)
                    ? data.arahanDireksi
                    : [];

                // 2. Mapping ke Format Monev (Meeting Decisions)
                // Kita copy data dari Arahan ke Meeting Decisions agar muncul di Monev
                const meetingDecisions = listArahan.map((item: any) => ({
                    id: item.id || crypto.randomUUID(),
                    text: item.text || item.value, // Handle variasi nama field
                    targetOutput: "", // Default kosong, nanti diisi di Monev
                    currentProgress: "",
                    evidencePath: null,
                    status: "ON_PROGRESS",
                    lastUpdated: new Date().toISOString()
                }));

                // 3. Update Database
                await tx.update(agendas)
                    .set({
                        meetingNumber: data.number,
                        meetingYear: data.year,
                        executionDate: data.date,
                        meetingLocation: data.location,
                        startTime: data.startTime,
                        endTime: data.endTime,

                        attendanceData: data.attendance,
                        guestParticipants: data.guests,
                        pimpinanRapat: JSON.stringify(data.selectedPimpinan),
                        catatanRapat: data.catatanKetidakhadiran,

                        executiveSummary: data.executiveSummary,

                        // Simpan di dua kolom: 
                        // 1. arahan_direksi (untuk display di Notulensi)
                        // 2. meeting_decisions (untuk data di Monev)
                        arahanDireksi: listArahan,
                        meetingDecisions: meetingDecisions,

                        status: "RAPAT_SELESAI", // ✅ UBAH DARI 'SELESAI' KE 'RAPAT_SELESAI'
                        meetingStatus: "COMPLETED",
                        monevStatus: "ON_PROGRESS", // Set default status monev
                        updatedAt: new Date(),
                    })
                    .where(eq(agendas.id, data.id))
            }
        })

        revalidatePath("/pelaksanaan-rapat/rakordir")
        revalidatePath("/monev/rakordir") // ✅ Revalidate halaman Monev juga
        return { success: true }
    } catch (error) {
        console.error("[ACTION-LIVE-ERROR]:", error)
        return {
            success: false,
            error: "Gagal menyimpan data pelaksanaan Rakordir",
        }
    }
}