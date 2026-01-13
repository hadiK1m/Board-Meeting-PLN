/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, desc } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

// --- TIPE DATA ---
// Pastikan tipe ini sesuai dengan yang ada di project Anda
interface MonevDecisionItem {
    id: string
    text: string
    targetOutput: string
    currentProgress: string
    status: "ON_PROGRESS" | "DONE"
    evidencePath?: string
    lastUpdated: string
}

// --- HELPER: AUTH GUARD ---
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Akses ditolak. Silakan login.")
    }
    return { user, supabase }
}

/**
 * 1. FETCH: Ambil Data Monev Radir
 */
export async function getMonevRadirList() {
    try {
        // [SECURE] Cek Login
        await assertAuthenticated()

        const data = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingType, "RADIR"),
                // Hanya tampilkan yang rapatnya sudah selesai
                eq(agendas.status, "RAPAT_SELESAI")
            ),
            orderBy: [desc(agendas.executionDate), desc(agendas.createdAt)],
        })

        return { success: true, data }
    } catch (error: any) {
        console.error("[GET_MONEV_RADIR_ERROR]", error)
        return { success: false, error: "Gagal memuat data Monev." }
    }
}

/**
 * 2. UPDATE: Update Item Keputusan Monev
 * (Mengembalikan logika Upload File & Status Global yang sempat hilang)
 */
export async function updateMonevDecisionAction(
    agendaId: string,
    decisionId: string,
    formData: FormData
) {
    try {
        // [SECURE] 1. Cek Login
        const { supabase } = await assertAuthenticated()

        // 2. Ambil Data Agenda Lama
        const existingAgenda = await db.query.agendas.findFirst({
            where: eq(agendas.id, agendaId)
        })

        if (!existingAgenda) throw new Error("Agenda tidak ditemukan.")

        // 3. Parse JSON meetingDecisions
        let decisions: MonevDecisionItem[] = []
        try {
            decisions = Array.isArray(existingAgenda.meetingDecisions)
                ? existingAgenda.meetingDecisions as MonevDecisionItem[]
                : JSON.parse(String(existingAgenda.meetingDecisions || "[]"))
        } catch { decisions = [] }

        // 4. Cari Index Item
        const index = decisions.findIndex(d => d.id === decisionId)
        if (index === -1) throw new Error("Item keputusan tidak ditemukan.")

        // 5. [RESTORED] Handle File Upload
        const file = formData.get("evidenceFile") as File
        let evidencePath = decisions[index].evidencePath || undefined

        if (file && file.size > 0) {
            // Validasi Ukuran (Max 10MB)
            if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10MB")

            // Hapus file lama jika ada
            if (evidencePath) {
                await supabase.storage.from("agenda-attachments").remove([evidencePath])
            }

            // Upload file baru (Gunakan UUID agar aman)
            const fileExt = file.name.split('.').pop()
            const fileName = `evidence/${agendaId}/${decisionId}_${randomUUID()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from("agenda-attachments")
                .upload(fileName, file)

            if (uploadError) throw new Error("Gagal upload evidence: " + uploadError.message)
            evidencePath = fileName
        }

        // 6. Update Data Item
        const newStatus = formData.get("status") as "ON_PROGRESS" | "DONE"
        decisions[index] = {
            ...decisions[index],
            targetOutput: formData.get("targetOutput") as string,
            currentProgress: formData.get("currentProgress") as string,
            status: newStatus,
            evidencePath: evidencePath,
            lastUpdated: new Date().toISOString()
        }

        // 7. [RESTORED] Hitung Global Status Agenda (Auto-Done Logic)
        const isAllDone = decisions.every(d => d.status === "DONE")
        const newGlobalStatus = isAllDone ? "DONE" : "ON_PROGRESS"

        // 8. Simpan ke Database
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
 * 3. [RESTORED] HELPER: Get Download URL Evidence
 */
export async function getEvidenceUrlAction(path: string) {
    try {
        // [SECURE] Cek Login
        const { supabase } = await assertAuthenticated()

        const { data } = await supabase.storage
            .from("agenda-attachments")
            .createSignedUrl(path, 3600) // Valid 1 Jam

        return data?.signedUrl || null
    } catch {
        return null
    }
}

/**
 * 4. ACTION: Create Manual Monev (Tambah Monev Manual)
 * (Mengembalikan logika Upload File)
 */
export async function createManualMonevAction(formData: FormData) {
    try {
        // [SECURE] Cek Login
        const { supabase } = await assertAuthenticated()

        const judul = formData.get("judul") as string
        const output = formData.get("output") as string
        const progress = formData.get("progress") as string
        const status = formData.get("status") as "ON_PROGRESS" | "DONE"
        const file = formData.get("evidenceFile") as File

        if (!judul) throw new Error("Judul keputusan harus diisi")

        // 1. [RESTORED] Handle File Upload
        let evidencePath = ""
        if (file && file.size > 0) {
            const fileExt = file.name.split('.').pop()
            const fileName = `evidence/manual/${randomUUID()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from("agenda-attachments")
                .upload(fileName, file)

            if (uploadError) throw new Error("Upload gagal: " + uploadError.message)
            evidencePath = fileName
        }

        // 2. Susun Struktur Keputusan
        const decisionItem: MonevDecisionItem = {
            id: randomUUID(),
            text: judul,
            targetOutput: output,
            currentProgress: progress,
            status: status,
            evidencePath: evidencePath,
            lastUpdated: new Date().toISOString()
        }

        // 3. Insert Database
        await db.insert(agendas).values({
            title: judul,
            meetingType: "RADIR",
            status: "RAPAT_SELESAI",
            meetingStatus: "COMPLETED",
            meetingNumber: "MANUAL",
            meetingYear: new Date().getFullYear().toString(),
            meetingDecisions: [decisionItem],
            monevStatus: status,

            // Default
            urgency: "Biasa",
            priority: "Medium",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/monev/radir")
        return { success: true, message: "Data Monev berhasil ditambahkan" }

    } catch (error: any) {
        console.error("Create Monev Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * 5. ACTION: Delete Monev
 */
export async function deleteMonevAction(id: string) {
    try {
        // [SECURE] Cek Login
        await assertAuthenticated()

        await db.delete(agendas).where(eq(agendas.id, id))

        revalidatePath("/monev/radir")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}