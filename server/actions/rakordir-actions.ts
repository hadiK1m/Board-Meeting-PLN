/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

// --- HELPER: AUTH GUARD ---
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Anda harus login untuk akses ini.")
    }
    return { user, supabase }
}

function cleanValue<T>(val: T, fallback: T): T {
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        return fallback
    }
    return val
}

/**
 * 1. ACTION: CREATE RAKORDIR
 */
export async function createRakordirAction(formData: FormData) {
    try {
        const { user } = await assertAuthenticated()

        const actionType = formData.get("actionType")
        const status = actionType === "submit" ? "DAPAT_DILANJUTKAN" : "DRAFT"

        // SEKARANG: Ambil PATH (string), bukan FILE object
        const proposalNotePath = formData.get("proposalNote") as string | null
        const presentationMaterialPath = formData.get("presentationMaterial") as string | null
        const supportingDocuments = formData.get("supportingDocuments") as string || "[]"

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

            // Simpan path yang sudah jadi string
            proposalNote: proposalNotePath,
            presentationMaterial: presentationMaterialPath,
            supportingDocuments: supportingDocuments,
            notRequiredFiles: (formData.get("notRequiredFiles") as string) || "[]",

            status,
            createdById: user.id, // Pastikan audit trail tersimpan
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
        const { supabase } = await assertAuthenticated()

        const oldData = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!oldData) return { success: false, error: "Data tidak ditemukan." }

        if (oldData.status === "DIJADWALKAN" || oldData.status === "SELESAI_RAPAT") {
            return { success: false, error: "Agenda sudah dikunci." }
        }

        // ✅ PERBAIKAN 1: Logika Update Status
        const actionType = formData.get("actionType")
        // Jika tombol 'Perbarui & Lanjutkan' diklik, set status ke DAPAT_DILANJUTKAN
        const status = actionType === "submit" ? "DAPAT_DILANJUTKAN" : oldData.status

        // Ambil path baru dari client (bukan file biner)
        const proposalNotePath = formData.get("proposalNote") as string | null
        const presentationMaterialPath = formData.get("presentationMaterial") as string | null
        const newSupportingDocsRaw = formData.get("supportingDocuments") as string | null

        // Handle file deletion flags
        const deleteProposalNote = formData.get("delete_proposalNote") === 'true'
        const deletePresentationMaterial = formData.get("delete_presentationMaterial") === 'true'
        const deleteSupportingDocs = formData.get("delete_supportingDocuments") === 'true'

        // Process proposalNote
        let finalProposalNote = oldData.proposalNote
        if (proposalNotePath) {
            // Hapus file lama jika ada
            if (oldData.proposalNote) {
                await supabase.storage.from('agenda-attachments').remove([oldData.proposalNote])
            }
            finalProposalNote = proposalNotePath
        } else if (deleteProposalNote && oldData.proposalNote) {
            await supabase.storage.from('agenda-attachments').remove([oldData.proposalNote])
            finalProposalNote = null
        }

        // Process presentationMaterial
        let finalPresentationMaterial = oldData.presentationMaterial
        if (presentationMaterialPath) {
            // Hapus file lama jika ada
            if (oldData.presentationMaterial) {
                await supabase.storage.from('agenda-attachments').remove([oldData.presentationMaterial])
            }
            finalPresentationMaterial = presentationMaterialPath
        } else if (deletePresentationMaterial && oldData.presentationMaterial) {
            await supabase.storage.from('agenda-attachments').remove([oldData.presentationMaterial])
            finalPresentationMaterial = null
        }

        // Process supportingDocuments
        let finalSupportingDocuments = oldData.supportingDocuments
        if (newSupportingDocsRaw) {
            // Hapus file lama jika ada
            if (oldData.supportingDocuments && typeof oldData.supportingDocuments === 'string') {
                try {
                    const oldPaths = JSON.parse(oldData.supportingDocuments)
                    if (Array.isArray(oldPaths) && oldPaths.length > 0) {
                        await supabase.storage.from('agenda-attachments').remove(oldPaths)
                    }
                } catch {
                    // Ignore parse error
                }
            }
            finalSupportingDocuments = newSupportingDocsRaw
        } else if (deleteSupportingDocs && oldData.supportingDocuments) {
            // Hapus semua supporting documents
            if (typeof oldData.supportingDocuments === 'string') {
                try {
                    const oldPaths = JSON.parse(oldData.supportingDocuments)
                    if (Array.isArray(oldPaths) && oldPaths.length > 0) {
                        await supabase.storage.from('agenda-attachments').remove(oldPaths)
                    }
                } catch {
                    // Ignore parse error
                }
            }
            finalSupportingDocuments = null
        }

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

            // Gunakan path yang sudah diproses
            proposalNote: finalProposalNote,
            presentationMaterial: finalPresentationMaterial,
            supportingDocuments: finalSupportingDocuments,

            // ✅ PERBAIKAN 2: Simpan status baru
            status: status,

            // ✅ PERBAIKAN 3: Pastikan notRequiredFiles selalu terupdate (gunakan nullish coalescing)
            notRequiredFiles: (formData.get("notRequiredFiles") as string) ?? "[]",

            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-UPDATE-ERROR]:", error)
        return { success: false, error: error.message || "Gagal update data Rakordir" }
    }
}

/**
 * 3. ACTION: DELETE RAKORDIR
 */
export async function deleteRakordirAction(id: string) {
    try {
        const { supabase } = await assertAuthenticated()

        const dataAgenda = await db.query.agendas.findFirst({ where: eq(agendas.id, id) })
        if (!dataAgenda) return { success: false, error: "Data tidak ditemukan." }

        // Kumpulkan semua file untuk dihapus
        const filesToDelete: string[] = []

        // Hapus proposalNote
        if (dataAgenda.proposalNote && typeof dataAgenda.proposalNote === 'string') {
            filesToDelete.push(dataAgenda.proposalNote)
        }

        // Hapus presentationMaterial
        if (dataAgenda.presentationMaterial && typeof dataAgenda.presentationMaterial === 'string') {
            filesToDelete.push(dataAgenda.presentationMaterial)
        }

        // Hapus supportingDocuments
        if (dataAgenda.supportingDocuments && typeof dataAgenda.supportingDocuments === 'string') {
            try {
                const extra = JSON.parse(dataAgenda.supportingDocuments)
                if (Array.isArray(extra)) {
                    filesToDelete.push(...extra.map(String))
                }
            } catch {
                // Ignore parse error
            }
        }

        // Hapus file dari storage
        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        // Hapus dari database
        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-DELETE-ERROR]:", error)
        return { success: false, error: error.message || "Gagal menghapus data Rakordir" }
    }
}

/**
 * 4. ACTION: UPDATE RAKORDIR (LIVE / PELAKSANAAN)
 */

export async function updateRakordirLiveAction(payloads: any[]) {
    try {
        await assertAuthenticated()

        await db.transaction(async (tx) => {
            for (const data of payloads) {
                const listArahan = Array.isArray(data.arahanDireksi) ? data.arahanDireksi : [];

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

                        // ✅ PERBAIKAN: Kirim object/array langsung untuk kolom jsonb
                        attendanceData: data.attendance,
                        guestParticipants: data.guests,
                        pimpinanRapat: data.selectedPimpinan, // Hapus JSON.stringify

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