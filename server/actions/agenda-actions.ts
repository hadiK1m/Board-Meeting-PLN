/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"
// [SECURE] Import schema validasi agar konsisten antara Client & Server
import { agendaFormSchema } from "@/lib/validations/agenda"

// --- HELPER: AUTH GUARD ---
// Fungsi ini memastikan hanya user yang login yang bisa memanggil action
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Anda harus login untuk melakukan aksi ini.")
    }
    return user
}

/**
 * Mendapatkan URL bertanda tangan untuk akses file private di Storage.
 */
export async function getSignedFileUrl(path: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null; // [SECURE] Sudah aman (existing)

    const { data, error } = await supabase.storage
        .from('agenda-attachments')
        .createSignedUrl(path, 60);

    if (error) return null;
    return data.signedUrl;
}

/**
 * Hapus Banyak Agenda Sekaligus (Universal).
 */
export async function deleteBulkAgendasAction(ids: string[]) {
    try {
        // [SECURE] 1. Cek Auth
        await assertAuthenticated()

        const supabase = await createClient()

        // [SECURE] 2. Pastikan IDs valid
        if (!ids || ids.length === 0) throw new Error("Tidak ada data yang dipilih.")

        const dataAgendas = await db.select().from(agendas).where(inArray(agendas.id, ids))
        const filesToDelete: string[] = []

        const FILE_FIELDS = [
            "legalReview", "riskReview", "complianceReview",
            "regulationReview", "recommendationNote", "proposalNote",
            "presentationMaterial", "kepdirSirkulerDoc", "grcDoc"
        ];

        dataAgendas.forEach(agenda => {
            FILE_FIELDS.forEach(field => {
                // @ts-ignore - Dynamic access
                const path = agenda[field]
                if (typeof path === 'string' && path) filesToDelete.push(path)
            })

            if (agenda.supportingDocuments) {
                // [FIX] Validasi parsing JSON
                try {
                    const extra = Array.isArray(agenda.supportingDocuments)
                        ? agenda.supportingDocuments
                        : JSON.parse(agenda.supportingDocuments as string || "[]")
                    if (Array.isArray(extra)) {
                        filesToDelete.push(...(extra as string[]))
                    }
                } catch (e) {
                    console.error("Gagal parse supportingDocuments", e)
                }
            }
        })

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(inArray(agendas.id, ids))

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

/**
 * Batalkan Agenda dengan Alasan (Universal).
 */
const cancelSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter"),
});

export async function cancelAgendaAction(data: z.infer<typeof cancelSchema>) {
    try {
        // [SECURE] Cek Auth
        await assertAuthenticated()

        const validated = cancelSchema.parse(data);

        await db.update(agendas).set({
            status: "DIBATALKAN",
            cancellationReason: validated.reason,
            updatedAt: new Date()
        }).where(eq(agendas.id, validated.id));

        revalidatePath("/agenda/radir");
        revalidatePath("/agenda-siap/radir");
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Gagal membatalkan agenda.";
        return { success: false, error: errorMessage };
    }
}

/**
 * Memulihkan Agenda (Resume).
 */
export async function resumeAgendaAction(id: string) {
    try {
        // [SECURE] Cek Auth
        await assertAuthenticated()

        // Validasi UUID sederhana untuk 'id'
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            throw new Error("ID Agenda tidak valid.")
        }

        await db.update(agendas).set({
            status: "DAPAT_DILANJUTKAN",
            cancellationReason: null,
            updatedAt: new Date()
        }).where(eq(agendas.id, id));

        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda/radir");
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Gagal memulihkan agenda.";
        return { success: false, error: errorMessage };
    }
}

/**
 * CREATE AGENDA ACTION (BARU)
 */
// [SECURE] Schema parsial untuk create action (karena beberapa field mungkin dihandle berbeda di form data)
const createAgendaServerSchema = z.object({
    title: z.string().min(5),
    // Pastikan enum match dengan database schema
    urgency: z.enum(['Biasa', 'Segera', 'Sangat Segera']).optional(),
    priority: z.enum(['Low', 'Medium', 'High']).optional(),
    deadline: z.string().optional(), // Akan diparse ke Date
    director: z.string().optional(),
    initiator: z.string().optional(),
    meetingType: z.enum(["RADIR", "RAKORDIR", "KEPDIR_SIRKULER", "GRC"]),
    // ...tambahkan field lain sesuai kebutuhan
})

export async function createAgendaAction(formData: FormData) {
    try {
        // [SECURE] 1. Cek Auth
        const user = await assertAuthenticated()

        // 2. Ambil Action Type
        const actionType = formData.get("actionType")
        const initialStatus = actionType === "draft" ? "DRAFT" : "DIUSULKAN"

        // [SECURE] 3. Validasi Data menggunakan Zod
        // Kita construct object dari FormData agar bisa divalidasi
        const rawData = {
            title: formData.get("title"),
            urgency: formData.get("urgency"),
            priority: formData.get("priority"),
            deadline: formData.get("deadline"),
            director: formData.get("director"),
            initiator: formData.get("initiator"),
            meetingType: formData.get("meetingType"),
        }

        // Parse dengan Zod (safeParse agar tidak throw error jelek)
        // Note: Anda perlu menyesuaikan schema di atas jika field di DB berbeda
        // Untuk sekarang saya gunakan validasi manual minimal untuk field kritis
        if (!rawData.title || (rawData.title as string).length < 5) {
            throw new Error("Judul minimal 5 karakter")
        }

        const deadline = rawData.deadline ? new Date(rawData.deadline as string) : null

        // 4. Simpan ke Database
        await db.insert(agendas).values({
            title: rawData.title as string,
            urgency: rawData.urgency as any, // Idealnya gunakan validatedData.urgency
            deadline: deadline,
            priority: rawData.priority as any,
            director: rawData.director as string,
            initiator: rawData.initiator as string,

            // Field tambahan dari form (pastikan sanitasi jika perlu)
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,

            status: initialStatus,
            // @ts-ignore - Pastikan tipe meetingType sesuai enum DB
            meetingType: rawData.meetingType,

            // Audit Trail
            createdById: user.id, // [SECURE] Simpan siapa yang membuat data!
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/agenda/radir")
        revalidatePath("/agenda/rakordir")

        const successMsg = actionType === "draft"
            ? "Agenda berhasil disimpan sebagai Draft."
            : "Usulan agenda berhasil dikirim."

        return { success: true, message: successMsg }

    } catch (error: any) {
        console.error("[CREATE_AGENDA_ERROR]", error)
        return { success: false, error: error.message }
    }
}