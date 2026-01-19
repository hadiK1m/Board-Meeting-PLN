/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, desc } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto" // Gunakan UUID untuk nama file yang lebih aman

// --- HELPER: AUTH GUARD ---
// Menjamin hanya user login yang bisa akses
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Akses ditolak. Silakan login.")
    }
    return { user, supabase }
}

/**
 * 1. FETCH: Ambil Data Monev RAKORDIR
 */
export async function getMonevRakordirList() {
    try {
        await assertAuthenticated()

        const data = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingType, "RAKORDIR"),
                eq(agendas.status, "RAPAT_SELESAI")
            ),
            orderBy: [desc(agendas.executionDate), desc(agendas.createdAt)],
        })

        // ✅ Transform data dengan type yang benar
        const enhancedData = data.map(agenda => {
            // Parse arahanDireksi dengan type safety
            let arahanDireksi: ArahanItem[] = []
            try {
                const arahanData = agenda.arahanDireksi
                if (Array.isArray(arahanData)) {
                    arahanDireksi = arahanData.map(item => ({
                        id: item.id || String(Math.random()),
                        text: item.text || '',
                        targetOutput: item.targetOutput || undefined,
                        currentProgress: item.currentProgress || undefined,
                        evidencePath: item.evidencePath || undefined,
                        status: (item.status === "DONE" ? "DONE" : "ON_PROGRESS") as "ON_PROGRESS" | "DONE",
                        lastUpdated: item.lastUpdated || new Date().toISOString()
                    }))
                }
            } catch (error) {
                console.error('Error parsing arahanDireksi:', error)
            }

            return {
                ...agenda,
                arahanDireksi,
                arahanCount: arahanDireksi.length,
                completedArahanCount: arahanDireksi.filter(a => a.status === "DONE").length
            }
        })

        return { success: true, data: enhancedData }
    } catch (error: any) {
        console.error("[GET_MONEV_RAKORDIR_ERROR]", error)
        return { success: false, error: "Gagal memuat data Monev Rakordir." }
    }
}

// ✅ Tambahkan interface ini di file yang sama atau di types file
interface ArahanItem {
    id: string
    text: string
    targetOutput?: string
    currentProgress?: string
    evidencePath?: string
    status: "ON_PROGRESS" | "DONE"
    lastUpdated?: string
}

/**
 * 2. ACTION: Create Manual Monev RAKORDIR (Istilah: Arahan)
 */
export async function createManualMonevRakordirAction(formData: FormData) {
    try {
        // [SECURE] 1. Cek Login & Ambil Client Supabase
        const { supabase } = await assertAuthenticated()

        const judul = formData.get("judul") as string
        const output = formData.get("output") as string
        const progress = formData.get("progress") as string
        const status = formData.get("status") as "ON_PROGRESS" | "DONE"
        const file = formData.get("evidenceFile") as File

        if (!judul) throw new Error("Judul arahan harus diisi")

        // [LOGIC PRESERVED] Upload File Logic
        let evidencePath = ""
        if (file && file.size > 0) {
            // [SECURE] Validasi Size (Max 10MB)
            if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10MB")

            const fileExt = file.name.split('.').pop()
            // [SECURE] Rename file dengan UUID
            const fileName = `evidence/manual-rakordir/${randomUUID()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from("agenda-attachments")
                .upload(fileName, file)

            if (uploadError) throw new Error("Upload gagal: " + uploadError.message)
            evidencePath = fileName
        }

        const arahanItem = {
            id: randomUUID(),
            text: judul,
            targetOutput: output,
            currentProgress: progress,
            status: status,
            evidencePath: evidencePath,
            lastUpdated: new Date().toISOString()
        }

        await db.insert(agendas).values({
            title: judul,
            meetingType: "RAKORDIR",
            status: "RAPAT_SELESAI",
            meetingStatus: "COMPLETED",
            meetingNumber: "MANUAL",
            meetingYear: new Date().getFullYear().toString(),
            meetingDecisions: [arahanItem],
            monevStatus: status,
            urgency: "Biasa", // Sesuaikan dengan enum DB Anda jika ada
            priority: "Medium",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/monev/rakordir")
        return { success: true, message: "Data Monev Rakordir berhasil ditambahkan" }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 3. ACTION: Update Arahan Monev RAKORDIR (Support Hapus File)
 * PERBAIKAN: Menggunakan arahanDireksi bukan meetingDecisions
 */
export async function updateMonevArahanAction(agendaId: string, arahanId: string, formData: FormData) {
    try {
        // [SECURE] 1. Cek Login & Ambil Client Supabase
        const { supabase } = await assertAuthenticated()

        const targetOutput = formData.get("targetOutput") as string
        const currentProgress = formData.get("currentProgress") as string
        const status = formData.get("status") as string
        const file = formData.get("evidenceFile") as File | null
        const removeEvidence = formData.get("removeEvidence") === "true"

        const existingAgenda = await db.query.agendas.findFirst({
            where: eq(agendas.id, agendaId)
        })

        if (!existingAgenda) throw new Error("Agenda tidak ditemukan")

        // ✅ PERBAIKAN UTAMA: Parse arahanDireksi, bukan meetingDecisions
        let arahans: any[] = []
        try {
            // Prioritaskan arahanDireksi, fallback ke meetingDecisions jika masih ada yang salah
            const arahanData = existingAgenda.arahanDireksi || existingAgenda.meetingDecisions
            arahans = Array.isArray(arahanData)
                ? arahanData
                : JSON.parse(String(arahanData || "[]"))
        } catch {
            arahans = []
        }

        const index = arahans.findIndex((a: any) => a.id === arahanId)
        if (index === -1) throw new Error("Item arahan tidak ditemukan")

        let newEvidencePath = arahans[index].evidencePath

        // Logic Hapus File Lama
        if (removeEvidence && newEvidencePath) {
            await supabase.storage.from('agenda-attachments').remove([newEvidencePath])
            newEvidencePath = null
        }

        // Logic Ganti File Baru
        if (file && file.size > 0) {
            if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10MB")

            // Hapus file lama jika ada
            if (newEvidencePath) {
                await supabase.storage.from('agenda-attachments').remove([newEvidencePath])
            }

            const fileExt = file.name.split('.').pop()
            const fileName = `evidence/rakordir/${agendaId}/${arahanId}_${randomUUID()}.${fileExt}`

            const { error } = await supabase.storage.from("agenda-attachments").upload(fileName, file)
            if (error) throw new Error("Gagal upload evidence baru")
            newEvidencePath = fileName
        }

        // Update Item Array
        arahans[index] = {
            ...arahans[index],
            targetOutput,
            currentProgress,
            status,
            evidencePath: newEvidencePath,
            lastUpdated: new Date().toISOString()
        }

        // Auto-Update Global Status
        const allDone = arahans.every((a: any) => a.status === "DONE")
        const newMonevStatus = allDone ? "DONE" : "ON_PROGRESS"

        // ✅ PERBAIKAN: Update arahanDireksi, bukan meetingDecisions
        await db.update(agendas)
            .set({
                arahanDireksi: arahans, // ✅ Update ke arahanDireksi
                monevStatus: newMonevStatus,
                updatedAt: new Date()
            })
            .where(eq(agendas.id, agendaId))

        revalidatePath("/monev/rakordir")
        return { success: true, message: "Arahan berhasil diupdate" }

    } catch (error: any) {
        console.error("[UPDATE_ARAHAN_ERROR]", error)
        return { success: false, error: error.message }
    }
}

/**
 * 4. HELPER: Get Signed URL
 */
export async function getEvidenceUrlAction(path: string | null) {
    if (!path) return null
    try {
        // [SECURE] Cek Login dulu agar file tidak bisa diakses publik tanpa sesi
        const { supabase } = await assertAuthenticated()

        const { data } = await supabase.storage.from("agenda-attachments").createSignedUrl(path, 3600)
        return data?.signedUrl || null
    } catch {
        return null
    }
}