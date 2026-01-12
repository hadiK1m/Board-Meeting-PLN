/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { eq } from "drizzle-orm"

// --- KONFIGURASI KEAMANAN ---
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ✅ Whitelist Tipe File (Security Hardening)
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint",
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
        throw new Error("Akses Ditolak: Anda harus login untuk melakukan aksi ini.")
    }
    return { user, supabase }
}

// --- HELPER: FILE VALIDATION ---
function validateFile(file: File) {
    // 1. Cek Ukuran
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} terlalu besar (Maks 50MB).`)
    }

    // 2. Cek Tipe File (Mencegah file .exe, .php, .sh dll)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Tipe file ${file.name} tidak didukung. Harap unggah PDF, Office Doc, atau Gambar.`)
    }
}

/**
 * HELPER: Upload file ke bucket 'agenda-attachments' dengan nama aman
 */
async function uploadToStorage(
    supabase: any,
    file: File,
    folder: string,
    userId: string
): Promise<string | null> {
    if (!file || file.size === 0 || file.name === 'undefined') return null

    try {
        validateFile(file)

        const fileExt = file.name.split(".").pop()
        // [SECURE] Menggunakan UUID v4 agar nama file tidak bisa ditebak
        const uniqueId = crypto.randomUUID()

        // Path terstruktur: rakordir / user_id / jenis_dokumen / uuid.ext
        const path = `rakordir/${userId}/${folder}/${uniqueId}.${fileExt}`

        const { data, error } = await supabase.storage
            .from("agenda-attachments")
            .upload(path, file)

        if (error) throw new Error(error.message)

        return data.path
    } catch (error: any) {
        console.error(`[STORAGE-UPLOAD-ERROR] ${folder}:`, error.message)
        throw error // Re-throw agar proses utama tahu ada kegagalan dan bisa membatalkan DB insert jika perlu
    }
}

/**
 * HELPER: Hapus file dari storage
 */
async function deleteFromStorage(supabase: any, paths: string[]) {
    const validPaths = paths.filter(p => p && p !== "" && p !== "null")
    if (validPaths.length === 0) return

    try {
        await supabase.storage
            .from("agenda-attachments")
            .remove(validPaths)
    } catch (error) {
        console.error("[STORAGE-DELETE-ERROR]:", error)
    }
}

/**
 * 1. ACTION: CREATE RAKORDIR
 */
export async function createRakordirAction(formData: FormData) {
    try {
        // [SECURE] Auth Check
        const { user, supabase } = await assertAuthenticated()

        // 🔑 ACTION TYPE
        const actionType = formData.get("actionType")
        const status = actionType === "submit" ? "DAPAT_DILANJUTKAN" : "DRAFT"

        // Upload file utama
        const proposalNoteFile = formData.get("proposalNote") as File
        const presentationMaterialFile = formData.get("presentationMaterial") as File

        // [SECURE] Upload menggunakan helper
        const proposalNotePath = await uploadToStorage(supabase, proposalNoteFile, "proposal", user.id)
        const presentationMaterialPath = await uploadToStorage(supabase, presentationMaterialFile, "presentation", user.id)

        // Upload supporting documents
        const supportingFiles = formData.getAll("supportingDocuments") as File[]
        const supportingPaths: string[] = []

        for (const file of supportingFiles) {
            const path = await uploadToStorage(supabase, file, "supporting", user.id)
            if (path) supportingPaths.push(path)
        }

        // Insert Database
        await db.insert(agendas).values({
            meetingType: "RAKORDIR",
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
            supportingDocuments: JSON.stringify(supportingPaths),
            notRequiredFiles: (formData.get("notRequiredFiles") as string) || "[]",

            status,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-CREATE-ERROR]:", error)
        return { success: false, error: error.message || "Gagal membuat agenda Rakordir" }
    }
}

/**
 * 2. ACTION: UPDATE RAKORDIR
 */
export async function updateRakordirAction(id: string, formData: FormData) {
    try {
        // [SECURE] Auth Check
        const { user, supabase } = await assertAuthenticated()

        const existing = await db.query.agendas.findFirst({
            where: eq(agendas.id, id),
        })

        if (!existing) throw new Error("Agenda tidak ditemukan")

        const actionType = formData.get("actionType")

        // Proposal Note Logic
        let proposalNotePath = existing.proposalNote
        const newProposalFile = formData.get("proposalNote") as File

        if (newProposalFile && newProposalFile.size > 0) {
            // Hapus file lama jika ada pengganti
            if (existing.proposalNote) {
                await deleteFromStorage(supabase, [existing.proposalNote])
            }
            proposalNotePath = await uploadToStorage(supabase, newProposalFile, "proposal", user.id)
        }

        // Presentation Material Logic
        let presentationMaterialPath = existing.presentationMaterial
        const newPresentationFile = formData.get("presentationMaterial") as File

        if (newPresentationFile && newPresentationFile.size > 0) {
            if (existing.presentationMaterial) {
                await deleteFromStorage(supabase, [existing.presentationMaterial])
            }
            presentationMaterialPath = await uploadToStorage(supabase, newPresentationFile, "presentation", user.id)
        }

        // Supporting Documents Logic
        let currentSupporting: string[] = []
        try {
            currentSupporting = JSON.parse((existing.supportingDocuments as string) || "[]")
        } catch { currentSupporting = [] }

        // Tambah file baru ke list yang sudah ada
        const newSupportingFiles = formData.getAll("supportingDocuments") as File[]
        for (const file of newSupportingFiles) {
            const path = await uploadToStorage(supabase, file, "supporting", user.id)
            if (path) currentSupporting.push(path)
        }

        // Catatan: Mekanisme penghapusan item spesifik dari supporting docs biasanya butuh UI terpisah 
        // yang mengirim flag 'delete_supporting_xyz', disini kita hanya append file baru.

        // DATA UPDATE
        const updateData: Record<string, any> = {
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
            updatedAt: new Date(),
        }

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
    } catch (error: any) {
        console.error("[ACTION-UPDATE-ERROR]:", error)
        return { success: false, error: error.message || "Gagal update agenda Rakordir" }
    }
}

/**
 * 3. ACTION: DELETE RAKORDIR
 */
export async function deleteRakordirAction(id: string) {
    try {
        // [SECURE] Auth Check
        const { supabase } = await assertAuthenticated()

        const existing = await db.query.agendas.findFirst({
            where: eq(agendas.id, id),
        })
        if (!existing) throw new Error("Agenda tidak ditemukan")

        const filesToDelete: string[] = []

        // Kumpulkan semua file terkait untuk dihapus bersih
        if (existing.proposalNote) filesToDelete.push(existing.proposalNote)
        if (existing.presentationMaterial) filesToDelete.push(existing.presentationMaterial)

        if (existing.supportingDocuments) {
            try {
                const supporting = JSON.parse(existing.supportingDocuments as string)
                if (Array.isArray(supporting)) {
                    filesToDelete.push(...supporting)
                }
            } catch { /* ignore JSON parse error */ }
        }

        if (filesToDelete.length > 0) {
            await deleteFromStorage(supabase, filesToDelete)
        }

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-DELETE-ERROR]:", error)
        return { success: false, error: "Gagal menghapus agenda" }
    }
}

/**
 * 4. ACTION: UPDATE RAKORDIR (LIVE / PELAKSANAAN)
 */
export async function updateRakordirLiveAction(payloads: any[]) {
    try {
        // [SECURE] Auth Check
        await assertAuthenticated()

        // Menggunakan Transaction agar jika satu gagal, semua batal (Atomic)
        await db.transaction(async (tx) => {
            for (const data of payloads) {
                // Sanitasi input list arahan
                const listArahan = Array.isArray(data.arahanDireksi) ? data.arahanDireksi : [];

                // Generate keputusan rapat awal
                const meetingDecisions = listArahan.map((item: any) => ({
                    id: item.id || crypto.randomUUID(),
                    text: item.text || item.value,
                    targetOutput: "",
                    currentProgress: "",
                    evidencePath: null,
                    status: "ON_PROGRESS",
                    lastUpdated: new Date().toISOString()
                }));

                await tx.update(agendas)
                    .set({
                        meetingNumber: data.number,
                        meetingYear: data.year,
                        executionDate: data.date,
                        meetingLocation: data.location,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        attendanceData: data.attendance, // Pastikan JSON valid dari client
                        guestParticipants: data.guests,  // Pastikan JSON valid dari client
                        pimpinanRapat: JSON.stringify(data.selectedPimpinan),
                        catatanRapat: data.catatanKetidakhadiran,
                        executiveSummary: data.executiveSummary,
                        arahanDireksi: listArahan,
                        meetingDecisions: meetingDecisions,
                        status: "RAPAT_SELESAI",
                        meetingStatus: "COMPLETED",
                        monevStatus: "ON_PROGRESS",
                        updatedAt: new Date(),
                    })
                    .where(eq(agendas.id, data.id))
            }
        })

        revalidatePath("/pelaksanaan-rapat/rakordir")
        revalidatePath("/monev/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-LIVE-ERROR]:", error)
        return { success: false, error: "Gagal menyimpan data pelaksanaan." }
    }
}