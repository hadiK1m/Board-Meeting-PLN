/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

// [SECURE] HELPER: AUTH GUARD
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
    if (!user) return null;

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
        await assertAuthenticated()
        const supabase = await createClient()

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
                // [FIX TS-7053] Casting agenda ke 'any' atau 'Record<string, any>' 
                // agar bisa diakses dengan string index secara dinamis
                const path = (agenda as Record<string, any>)[field]
                if (typeof path === 'string' && path) filesToDelete.push(path)
            })

            if (agenda.supportingDocuments) {
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
 * Batalkan Agenda dengan Alasan.
 */
const cancelSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter"),
});

export async function cancelAgendaAction(data: z.infer<typeof cancelSchema>) {
    try {
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
        await assertAuthenticated()
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
 * CREATE AGENDA ACTION
 */
// [SECURE] Schema validasi Server Side
// [FIX ESLint] Schema ini sekarang digunakan di bawah
const createAgendaServerSchema = z.object({
    title: z.string().min(5, "Judul minimal 5 karakter"),
    // Transform string kosong menjadi null/undefined agar sesuai dengan database optional
    urgency: z.enum(['Biasa', 'Segera', 'Sangat Segera']).optional().or(z.literal('')),
    priority: z.enum(['Low', 'Medium', 'High']).optional().or(z.literal('')),
    deadline: z.string().optional().or(z.literal('')),
    director: z.string().optional(),
    initiator: z.string().optional(),
    // Pastikan enum ini match persis dengan di DB
    meetingType: z.enum(["RADIR", "RAKORDIR", "KEPDIR_SIRKULER", "GRC"]),
    support: z.string().optional(),
    contactPerson: z.string().optional(),
    position: z.string().optional(),
    phone: z.string().optional(),
})

export async function createAgendaAction(formData: FormData) {
    try {
        // [SECURE] 1. Cek Auth
        const user = await assertAuthenticated()

        // 2. Ambil Action Type
        const actionType = formData.get("actionType")
        const initialStatus = actionType === "draft" ? "DRAFT" : "DIUSULKAN"

        // [SECURE] 3. Validasi Data menggunakan Zod
        // [FIX TS-2769] Kita ekstrak data dari formData dan casting ke string agar Zod bisa memprosesnya
        const rawData = {
            title: formData.get("title")?.toString(),
            urgency: formData.get("urgency")?.toString() || undefined,
            priority: formData.get("priority")?.toString() || undefined,
            deadline: formData.get("deadline")?.toString() || undefined,
            director: formData.get("director")?.toString(),
            initiator: formData.get("initiator")?.toString(),
            meetingType: formData.get("meetingType")?.toString(),
            support: formData.get("support")?.toString(),
            contactPerson: formData.get("contactPerson")?.toString(),
            position: formData.get("position")?.toString(),
            phone: formData.get("phone")?.toString(),
        }

        // [FIX ESLint] Menggunakan schema yang sudah didefinisikan
        const validatedFields = createAgendaServerSchema.safeParse(rawData)

        if (!validatedFields.success) {
            // Return error pertama yang ditemukan
            const errorMsg = validatedFields.error.issues[0].message
            throw new Error(errorMsg)
        }

        const data = validatedFields.data

        // Konversi deadline string ke Date object jika ada
        const deadlineDate = data.deadline ? new Date(data.deadline) : null

        // 4. Simpan ke Database
        // [FIX TS-2769] Karena sudah divalidasi Zod, tipe datanya aman untuk Drizzle
        await db.insert(agendas).values({
            title: data.title,
            // Cast ke 'any' aman di sini karena Zod sudah memastikan value-nya valid sesuai Enum
            urgency: (data.urgency as any) || null,
            priority: (data.priority as any) || null,
            deadline: deadlineDate,
            director: data.director || null,
            initiator: data.initiator || null,
            meetingType: data.meetingType as any, // "RADIR" | "RAKORDIR" | ...

            support: data.support || null,
            contactPerson: data.contactPerson || null,
            position: data.position || null,
            phone: data.phone || null,

            status: initialStatus,

            // Audit Trail
            createdById: user.id,
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