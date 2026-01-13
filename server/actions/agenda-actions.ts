/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

// ────────────────────────────────────────────────
// 1. HELPER: AUTHENTICATION
// ────────────────────────────────────────────────

/**
 * Memastikan user sudah login.
 * Mengembalikan objek user untuk keperluan audit trail (createdById).
 */
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Anda harus login untuk melakukan aksi ini.")
    }
    return user
}

/**
 * HELPER: Cek Eksistensi Agenda (Kolaboratif)
 * Menggantikan assertAgendaOwnership. 
 * Fungsi ini memastikan data ada di DB tanpa membatasi siapa pengelolanya.
 */
async function assertAgendaExists(agendaIds: string | string[]) {
    await assertAuthenticated() // Wajib login
    const ids = Array.isArray(agendaIds) ? agendaIds : [agendaIds]

    if (ids.length === 0) return

    const found = await db
        .select({ id: agendas.id })
        .from(agendas)
        .where(inArray(agendas.id, ids))

    if (found.length !== ids.length) {
        throw new Error("Error: Satu atau lebih data tidak ditemukan di database.")
    }
}

// ────────────────────────────────────────────────
// 2. ACTION: GET SIGNED URL (VERSI TERBARU & AMAN)
// ────────────────────────────────────────────────

/**
 * Menghasilkan signed URL sementara untuk mengakses file private di Supabase Storage.
 * @param path Path file di bucket (contoh: "radir/uuid/filename.pdf")
 * @returns Object dengan signed URL atau error
 */
export async function getSignedFileUrl(path: string) {
    try {
        // 1. Pastikan user sudah login (wajib untuk akses file private)
        const user = await assertAuthenticated();

        // 2. Validasi path sederhana (opsional tapi mencegah abuse)
        if (!path || typeof path !== "string" || !path.startsWith("radir/")) {
            throw new Error("Path file tidak valid atau tidak diizinkan.");
        }

        const supabase = await createClient();

        // 3. Buat signed URL dengan expiry 1 jam (3600 detik)
        //    Bisa diubah ke 7200 (2 jam) jika dokumen panjang
        const { data, error } = await supabase.storage
            .from("agenda-attachments")
            .createSignedUrl(path, 3600, {
                // Opsi tambahan untuk keamanan (opsional)
                download: false, // default: false → buka di browser, bukan force download
            });

        if (error) {
            console.error("[SIGNED_URL_GENERATION_ERROR]", {
                path,
                userId: user.id,
                errorMessage: error.message,
            });
            throw error;
        }

        if (!data?.signedUrl) {
            throw new Error("Gagal menghasilkan signed URL.");
        }

        return {
            success: true,
            url: data.signedUrl,
        };

    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : "Gagal menghasilkan link akses file.";

        console.error("[GET_SIGNED_URL_ERROR]", {
            path,
            error: errorMessage,
        });

        return {
            success: false,
            error: errorMessage,
        };
    }
}
// ────────────────────────────────────────────────
// 3. ACTION: BULK DELETE AGENDA
// ────────────────────────────────────────────────

export async function deleteBulkAgendasAction(ids: string[]) {
    try {
        if (!ids || ids.length === 0) throw new Error("Tidak ada data yang dipilih.")
        if (ids.length > 50) throw new Error("Maksimal 50 agenda per aksi untuk keamanan.")

        // Cek login & pastikan data ada (Collaborative Access)
        await assertAgendaExists(ids)
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

            // Kumpulkan semua path file dari agenda yang akan dihapus
            dataAgendas.forEach((agenda) => {
                FILE_FIELDS.forEach((field) => {
                    const pathValue = (agenda as any)[field]
                    if (typeof pathValue === "string" && pathValue) {
                        filesToDelete.push(pathValue)
                    }
                })

                // Parsing Supporting Documents (JSONB)
                if (agenda.supportingDocuments) {
                    try {
                        const extra = Array.isArray(agenda.supportingDocuments)
                            ? agenda.supportingDocuments
                            : JSON.parse(agenda.supportingDocuments as string || "[]")

                        if (Array.isArray(extra)) {
                            filesToDelete.push(...extra.filter((p): p is string => typeof p === "string"))
                        }
                    } catch (parseErr) {
                        console.error("[PARSE_SUPPORTING_DOCS_ERROR]", parseErr)
                    }
                }
            })

            // 1. Hapus dari Database
            await tx.delete(agendas).where(inArray(agendas.id, ids))

            // 2. Hapus file fisik di Storage
            if (filesToDelete.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from("agenda-attachments")
                    .remove(filesToDelete)

                if (storageError) {
                    // Log warning tapi jangan gagalkan transaksi DB jika file sudah hilang di storage
                    console.warn("[STORAGE_DELETE_WARNING]:", storageError.message)
                }
            }
        })

        // Revalidasi semua halaman terkait
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
// 4. ACTION: CANCEL AGENDA
// ────────────────────────────────────────────────

const cancelSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter"),
})

export async function cancelAgendaAction(data: z.infer<typeof cancelSchema>) {
    try {
        const validated = cancelSchema.parse(data)

        // Cek login & pastikan data ada (Collaborative Access)
        await assertAgendaExists(validated.id)

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
// 5. ACTION: RESUME AGENDA
// ────────────────────────────────────────────────

export async function resumeAgendaAction(id: string) {
    try {
        // Validasi format UUID sederhana
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            throw new Error("ID Agenda tidak valid.")
        }

        // Cek login & pastikan data ada (Collaborative Access)
        await assertAgendaExists(id)

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
// 6. ACTION: CREATE AGENDA
// ────────────────────────────────────────────────

const createAgendaServerSchema = z.object({
    title: z.string().min(5, "Judul minimal 5 karakter"),
    urgency: z.string().min(1, "Urgensi harus diisi"),
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
        // 1. Dapatkan user untuk Audit Trail (createdById)
        const user = await assertAuthenticated()

        const actionType = formData.get("actionType") as string | null
        const initialStatus = actionType === "draft" ? "DRAFT" : "DIUSULKAN"

        // 2. Kumpulkan data dari FormData
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

        // 3. Validasi dengan Zod
        const validated = createAgendaServerSchema.parse(rawData)
        const deadlineDate = validated.deadline ? new Date(validated.deadline) : null

        // 4. Insert ke Database
        await db.insert(agendas).values({
            title: validated.title,
            urgency: validated.urgency,
            priority: (validated.priority as any) ?? null,
            deadline: deadlineDate,
            director: validated.director ?? null,
            initiator: validated.initiator ?? null,
            meetingType: validated.meetingType as any,
            support: validated.support ?? null,
            contactPerson: validated.contactPerson ?? null,
            position: validated.position ?? null,
            phone: validated.phone ?? null,

            status: initialStatus,
            createdById: user.id, // Audit trail: Siapa yang membuat
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda/rakordir")

        const successMsg = actionType === "draft"
            ? "Agenda berhasil disimpan sebagai Draft."
            : "Usulan agenda berhasil dikirim."

        return { success: true, message: successMsg }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal membuat agenda."
        console.error("[CREATE_AGENDA_ERROR]:", msg)
        return { success: false, error: msg }
    }
}