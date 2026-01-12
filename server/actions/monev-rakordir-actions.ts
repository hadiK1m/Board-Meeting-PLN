/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, desc } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * 1. FETCH: Ambil Data Monev RAKORDIR
 */
export async function getMonevRakordirList() {
    try {
        const data = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingType, "RAKORDIR"),
                eq(agendas.status, "RAPAT_SELESAI")
            ),
            orderBy: [desc(agendas.executionDate), desc(agendas.createdAt)],
        })

        return { success: true, data }
    } catch (error: any) {
        console.error("[GET_MONEV_RAKORDIR_ERROR]", error)
        return { success: false, error: "Gagal memuat data Monev Rakordir." }
    }
}

/**
 * 2. ACTION: Create Manual Monev RAKORDIR (Istilah: Arahan)
 */
export async function createManualMonevRakordirAction(formData: FormData) {
    const supabase = await createClient()

    try {
        const judul = formData.get("judul") as string // Judul Arahan
        const output = formData.get("output") as string
        const progress = formData.get("progress") as string
        const status = formData.get("status") as "ON_PROGRESS" | "DONE"
        const file = formData.get("evidenceFile") as File

        if (!judul) throw new Error("Judul arahan harus diisi")

        let evidencePath = ""
        if (file && file.size > 0) {
            const fileName = `evidence/manual-rakordir/${Date.now()}_${file.name}`.replace(/\s+/g, '_')
            const { error: uploadError } = await supabase.storage
                .from("agenda-attachments")
                .upload(fileName, file)

            if (uploadError) throw new Error("Upload gagal: " + uploadError.message)
            evidencePath = fileName
        }

        const arahanItem = {
            id: crypto.randomUUID(),
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
            meetingDecisions: [arahanItem], // Disimpan di kolom yang sama tapi dianggap Arahan
            monevStatus: status,
            urgency: "Normal",
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
 */
export async function updateMonevArahanAction(agendaId: string, decisionId: string, formData: FormData) {
    const supabase = await createClient()

    try {
        const targetOutput = formData.get("targetOutput") as string
        const currentProgress = formData.get("currentProgress") as string
        const status = formData.get("status") as string
        const file = formData.get("evidenceFile") as File | null
        const removeEvidence = formData.get("removeEvidence") === "true"

        const existingAgenda = await db.query.agendas.findFirst({
            where: eq(agendas.id, agendaId)
        })

        if (!existingAgenda) throw new Error("Agenda tidak ditemukan")


        const arahans = (existingAgenda.meetingDecisions as any[]) || []
        const index = arahans.findIndex((d: any) => d.id === decisionId)

        if (index === -1) throw new Error("Item arahan tidak ditemukan")

        let newEvidencePath = arahans[index].evidencePath

        // Logic Hapus / Ganti File
        if (removeEvidence && newEvidencePath) {
            await supabase.storage.from('agenda-attachments').remove([newEvidencePath])
            newEvidencePath = null
        }

        if (file && file.size > 0) {
            if (newEvidencePath) {
                await supabase.storage.from('agenda-attachments').remove([newEvidencePath])
            }
            const fileName = `evidence/rakordir/${agendaId}/${decisionId}_${Date.now()}_${file.name}`.replace(/\s+/g, '_')
            const { error } = await supabase.storage.from("agenda-attachments").upload(fileName, file)
            if (error) throw new Error("Gagal upload evidence baru")
            newEvidencePath = fileName
        }

        arahans[index] = {
            ...arahans[index],
            targetOutput,
            currentProgress,
            status,
            evidencePath: newEvidencePath,
            lastUpdated: new Date().toISOString()
        }

        const allDone = arahans.every((d: any) => d.status === "DONE")
        const newMonevStatus = allDone ? "DONE" : "ON_PROGRESS"

        await db.update(agendas)
            .set({
                meetingDecisions: arahans,
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

// Helper untuk get URL (bisa reuse dari monev-radir-actions atau buat export baru disini jika mau isolated)
export async function getEvidenceUrlAction(path: string | null) {
    if (!path) return null
    const supabase = await createClient()
    const { data } = await supabase.storage.from("agenda-attachments").createSignedUrl(path, 3600)
    return data?.signedUrl || null
}