/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq, inArray, and } from "drizzle-orm"
import { z } from "zod"

// ────────────────────────────────────────────────
// HELPER: AUTH & OWNERSHIP
// ────────────────────────────────────────────────

async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Anda harus login untuk melakukan aksi ini.")
    }
    return user
}

async function assertAgendaOwnership(agendaIds: string | string[]) {
    const user = await assertAuthenticated()
    const ids = Array.isArray(agendaIds) ? agendaIds : [agendaIds]

    if (ids.length === 0) return user

    const owned = await db
        .select({ id: agendas.id })
        .from(agendas)
        .where(and(inArray(agendas.id, ids), eq(agendas.createdById, user.id)))

    if (owned.length !== ids.length) {
        throw new Error("Forbidden: Anda tidak memiliki hak atas salah satu agenda.")
    }
    return user
}

// ────────────────────────────────────────────────
// ACTION: Mendapatkan Signed URL (dengan ownership check)
// ────────────────────────────────────────────────

export async function getSignedFileUrl(path: string) {
    try {
        await assertAuthenticated()
        // Regex fleksibel: mencari UUID di mana saja dalam path
        const match = path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
        if (!match) throw new Error("Format path file tidak valid.")

        const agendaId = match[1]
        await assertAgendaOwnership(agendaId)

        const supabase = await createClient()
        const { data, error } = await supabase.storage
            .from('agenda-attachments')
            .createSignedUrl(path, 60)

        if (error) throw error
        return data.signedUrl
    } catch (error: unknown) {
        console.error("[SIGNED_URL_ERROR]", error instanceof Error ? error.message : "Failed to generate signed URL")
        return null
    }
}

// ────────────────────────────────────────────────
// ACTION: Bulk Delete Agenda (dengan transaction)
// ────────────────────────────────────────────────

export async function deleteBulkAgendasAction(ids: string[]) {
    try {
        if (!ids || ids.length === 0) throw new Error("Tidak ada data yang dipilih.")
        if (ids.length > 50) throw new Error("Maksimal 50 agenda per aksi untuk mencegah abuse.")

        await assertAgendaOwnership(ids)
        const supabase = await createClient()

        await db.transaction(async (tx) => {
            const dataAgendas = await tx
                .select()
                .from(agendas)
                .where(inArray(agendas.id, ids))

            const filesToDelete: string[] = []

            const FILE_FIELDS = [
                "legalReview",
                "riskReview",
                "complianceReview",
                "regulationReview",
                "recommendationNote",
                "proposalNote",
                "presentationMaterial",
                "kepdirSirkulerDoc",
                "grcDoc",
            ] as const

            dataAgendas.forEach((agenda) => {
                FILE_FIELDS.forEach((field) => {
                    // Casting diperlukan karena Drizzle tidak infer dynamic key access dengan baik
                    const path = (agenda as any)[field]
                    if (typeof path === "string" && path) {
                        filesToDelete.push(path)
                    }
                })

                if (agenda.supportingDocuments) {
                    try {
                        const extra = Array.isArray(agenda.supportingDocuments)
                            ? agenda.supportingDocuments
                            : JSON.parse(agenda.supportingDocuments as string || "[]")

                        if (Array.isArray(extra)) {
                            filesToDelete.push(...extra.filter((p): p is string => typeof p === "string"))
                        }
                    } catch (parseErr) {
                        console.error(
                            "[PARSE_SUPPORTING_DOCS_ERROR]",
                            parseErr instanceof Error ? parseErr.message : "Parse failed"
                        )
                    }
                }
            })

            // Hapus dari DB dulu
            await tx.delete(agendas).where(inArray(agendas.id, ids))

            // Baru hapus file di storage
            if (filesToDelete.length > 0) {
                const { error } = await supabase.storage.from("agenda-attachments").remove(filesToDelete)
                if (error) throw new Error(`Gagal hapus file: ${error.message}`)
            }
        })

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda/rakordir")
        revalidatePath("/agenda/kepdir-sirkuler")
        revalidatePath("/agenda-siap/radir")

        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus bulk data."
        console.error("[BULK-DELETE-ERROR]:", msg)
        return { success: false, error: msg }
    }
}

// ────────────────────────────────────────────────
// ACTION: Cancel Agenda
// ────────────────────────────────────────────────

const cancelSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter"),
})

export async function cancelAgendaAction(data: z.infer<typeof cancelSchema>) {
    try {
        const validated = cancelSchema.parse(data)
        await assertAgendaOwnership(validated.id)

        await db.update(agendas).set({
            status: "DIBATALKAN",
            cancellationReason: validated.reason,
            updatedAt: new Date(),
        }).where(eq(agendas.id, validated.id))

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda-siap/radir")

        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal membatalkan agenda."
        console.error("[CANCEL_AGENDA_ERROR]:", msg)
        return { success: false, error: msg }
    }
}

// ────────────────────────────────────────────────
// ACTION: Resume Agenda
// ────────────────────────────────────────────────

export async function resumeAgendaAction(id: string) {
    try {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            throw new Error("ID Agenda tidak valid.")
        }

        await assertAgendaOwnership(id)

        await db.update(agendas).set({
            status: "DAPAT_DILANJUTKAN",
            cancellationReason: null,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        revalidatePath("/agenda-siap/radir")
        revalidatePath("/agenda/radir")

        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal memulihkan agenda."
        console.error("[RESUME_AGENDA_ERROR]:", msg)
        return { success: false, error: msg }
    }
}

// ────────────────────────────────────────────────
// ACTION: Create Agenda (FIX parameter mismatch)
// ────────────────────────────────────────────────

const createAgendaServerSchema = z.object({
    title: z.string().min(5, "Judul minimal 5 karakter"),
    urgency: z.string().min(1, "Urgensi harus diisi"), // textarea → string panjang
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    deadline: z.string().optional(),
    director: z.string().optional(),
    initiator: z.string().optional(),
    meetingType: z.enum(["RADIR", "RAKORDIR", "KEPDIR_SIRKULER", "GRC"]),
    support: z.string().optional(),
    contactPerson: z.string().optional(),
    position: z.string().optional(),
    phone: z.string().optional(),
})

export async function createAgendaAction(formData: FormData) {
    try {
        const user = await assertAuthenticated()

        const actionType = formData.get("actionType") as string | null
        const initialStatus = actionType === "draft" ? "DRAFT" : "DIUSULKAN"

        const rawData = {
            title: formData.get("title")?.toString(),
            urgency: formData.get("urgency")?.toString(),
            priority: formData.get("priority")?.toString(),
            deadline: formData.get("deadline")?.toString(),
            director: formData.get("director")?.toString(),
            initiator: formData.get("initiator")?.toString(),
            meetingType: formData.get("meetingType")?.toString(),
            support: formData.get("support")?.toString(),
            contactPerson: formData.get("contactPerson")?.toString(),
            position: formData.get("position")?.toString(),
            phone: formData.get("phone")?.toString(),
        }

        const validated = createAgendaServerSchema.parse(rawData)

        const deadlineDate = validated.deadline ? new Date(validated.deadline) : null

        // ── INSERT HANYA KOLOM YANG ADA ──
        // Ini yang menghilangkan error parameter mismatch
        await db.insert(agendas).values({
            title: validated.title,
            urgency: validated.urgency,
            priority: validated.priority ?? null,
            deadline: deadlineDate,
            director: validated.director ?? null,
            initiator: validated.initiator ?? null,
            meetingType: validated.meetingType,
            support: validated.support ?? null,
            contactPerson: validated.contactPerson ?? null,
            position: validated.position ?? null,
            phone: validated.phone ?? null,

            status: initialStatus,
            createdById: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),

            // Kolom lain (legal_review, grc_doc, risalah_*, dll.) akan pakai DEFAULT / NULL dari schema DB
        })

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda/rakordir")

        const successMsg =
            actionType === "draft"
                ? "Agenda berhasil disimpan sebagai Draft."
                : "Usulan agenda berhasil dikirim."

        return { success: true, message: successMsg }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal membuat agenda."
        console.error("[CREATE_AGENDA_ERROR]:", msg, error)
        return { success: false, error: msg }
    }
}