/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, desc } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { MonevDecisionItem } from "@/lib/types/monev" // Pastikan path import sesuai lokasi file types Anda

/**
 * 1. FETCH: Ambil Data Monev Radir
 * Syarat: Meeting Type = RADIR, Status = COMPLETED
 */
export async function getMonevRadirList() {
    try {
        const data = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingType, "RADIR"),
                // Hanya ambil yang sudah selesai rapatnya (COMPLETED)
                // eq(agendas.status, "COMPLETED") // Uncomment jika data dummy Anda sudah status COMPLETED semua
            ),
            orderBy: [desc(agendas.executionDate)],
        })

        // Filter manual untuk memastikan hanya yang COMPLETED jika di query bermasalah dengan enum
        // Atau biarkan logic where di atas jika type-safe.
        // Untuk saat ini kita return semua RADIR agar Anda bisa melihat datanya dulu.
        return { success: true, data }
    } catch (error: any) {
        console.error("[GET_MONEV_RADIR_ERROR]", error)
        return { success: false, error: "Gagal memuat data Monev." }
    }
}

/**
 * 2. UPDATE: Update Item Keputusan Monev
 * - Menangani Upload File Evidence
 * - Mengupdate JSON meetingDecisions
 * - Mengupdate Global Status Agenda (Monev Status)
 */
export async function updateMonevDecisionAction(
    agendaId: string,
    decisionId: string,
    formData: FormData
) {
    const supabase = await createClient()

    try {
        // 1. Ambil Data Agenda Lama
        const existingAgenda = await db.query.agendas.findFirst({
            where: eq(agendas.id, agendaId)
        })

        if (!existingAgenda) throw new Error("Agenda tidak ditemukan.")

        // 2. Parse JSON meetingDecisions lama
        let decisions: MonevDecisionItem[] = []
        if (Array.isArray(existingAgenda.meetingDecisions)) {
            decisions = existingAgenda.meetingDecisions as MonevDecisionItem[]
        } else {
            // Fallback jika string
            decisions = JSON.parse(String(existingAgenda.meetingDecisions || "[]"))
        }

        // 3. Cari Index Item yang akan diupdate
        const index = decisions.findIndex(d => d.id === decisionId)
        if (index === -1) throw new Error("Item keputusan tidak ditemukan.")

        // 4. Handle File Upload (Jika ada file baru)
        const file = formData.get("evidenceFile") as File
        let evidencePath = decisions[index].evidencePath || undefined

        if (file && file.size > 0) {
            // Validasi (Opsional)
            if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran file maksimal 5MB")

            // Hapus file lama jika ada
            if (evidencePath) {
                await supabase.storage.from("monev-evidence").remove([evidencePath])
            }

            // Upload file baru
            const fileName = `evidence/${agendaId}/${decisionId}_${Date.now()}_${file.name}`.replace(/\s+/g, '_')
            const { error: uploadError } = await supabase.storage
                .from("agenda-attachments") // Gunakan bucket yang sama atau buat 'monev-evidence'
                .upload(fileName, file)

            if (uploadError) throw new Error("Gagal upload evidence: " + uploadError.message)
            evidencePath = fileName
        }

        // 5. Update Data Item
        const newStatus = formData.get("status") as "ON_PROGRESS" | "DONE"

        decisions[index] = {
            ...decisions[index],
            targetOutput: formData.get("targetOutput") as string,
            currentProgress: formData.get("currentProgress") as string,
            status: newStatus,
            evidencePath: evidencePath,
            lastUpdated: new Date().toISOString()
        }

        // 6. Hitung Global Status Agenda
        // Jika SEMUA item statusnya "DONE", maka Global = DONE. Jika tidak, ON_PROGRESS.
        const isAllDone = decisions.every(d => d.status === "DONE")
        const newGlobalStatus = isAllDone ? "DONE" : "ON_PROGRESS"

        // 7. Simpan ke Database
        await db.update(agendas)
            .set({
                meetingDecisions: decisions,
                monevStatus: newGlobalStatus,
                updatedAt: new Date()
            })
            .where(eq(agendas.id, agendaId))

        revalidatePath("/monev/radir")

        return { success: true, message: "Progress berhasil diperbarui." }

    } catch (error: any) {
        console.error("[UPDATE_MONEV_ERROR]", error)
        return { success: false, error: error.message }
    }
}

/**
 * 3. HELPER: Get Download URL Evidence
 */
export async function getEvidenceUrlAction(path: string) {
    const supabase = await createClient()
    const { data } = await supabase.storage
        .from("agenda-attachments")
        .createSignedUrl(path, 3600) // 1 Jam

    return data?.signedUrl || null
}