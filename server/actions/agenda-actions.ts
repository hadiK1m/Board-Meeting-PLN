/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

/**
 * Mendapatkan URL bertanda tangan untuk akses file private di Storage.
 * Digunakan secara universal oleh semua modul.
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
 * Menghapus data di database dan file terkait di storage.
 */
export async function deleteBulkAgendasAction(ids: string[]) {
    const supabase = await createClient()
    try {
        const dataAgendas = await db.select().from(agendas).where(inArray(agendas.id, ids))
        const filesToDelete: string[] = []

        const FILE_FIELDS = [
            "legalReview", "riskReview", "complianceReview",
            "regulationReview", "recommendationNote", "proposalNote",
            "presentationMaterial", "kepdirSirkulerDoc", "grcDoc"
        ];

        dataAgendas.forEach(agenda => {
            // Cek field file utama
            FILE_FIELDS.forEach(field => {
                const path = agenda[field as keyof typeof agenda]
                if (typeof path === 'string' && path) filesToDelete.push(path)
            })

            // Cek dokumen pendukung (JSONB)
            if (agenda.supportingDocuments) {
                const extra = Array.isArray(agenda.supportingDocuments)
                    ? agenda.supportingDocuments
                    : JSON.parse(agenda.supportingDocuments as string || "[]")
                if (Array.isArray(extra)) {
                    filesToDelete.push(...(extra as string[]))
                }
            }
        })

        if (filesToDelete.length > 0) {
            await supabase.storage.from('agenda-attachments').remove(filesToDelete)
        }

        await db.delete(agendas).where(inArray(agendas.id, ids))

        // Revalidate semua path yang mungkin terpengaruh
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
 * Digunakan saat agenda sudah di tahap "Siap" tapi batal dilaksanakan.
 */
const cancelSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter"),
});

export async function cancelAgendaAction(data: z.infer<typeof cancelSchema>) {
    try {
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
 * Mengembalikan status agenda "DIBATALKAN" menjadi "DAPAT_DILANJUTKAN".
 */
export async function resumeAgendaAction(id: string) {
    try {
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
 * Menangani pembuatan agenda baru, baik sebagai DRAFT maupun Submit.
 */
export async function createAgendaAction(formData: FormData) {
    try {
        // 1. Ambil Action Type untuk menentukan status
        const actionType = formData.get("actionType")

        // Status awal: Jika 'draft' -> DRAFT, jika tidak -> DIUSULKAN (atau status awal workflow Anda)
        const initialStatus = actionType === "draft" ? "DRAFT" : "DIUSULKAN"

        // 2. Parse Data Form (Sesuaikan dengan field yang ada di form Anda)
        const title = formData.get("title") as string
        const urgency = formData.get("urgency") as string
        const deadline = formData.get("deadline") as string // Pastikan format YYYY-MM-DD atau ISO
        const priority = formData.get("priority") as string
        const director = formData.get("director") as string
        const initiator = formData.get("initiator") as string
        const support = formData.get("support") as string
        const contactPerson = formData.get("contactPerson") as string
        const position = formData.get("position") as string
        const phone = formData.get("phone") as string
        const meetingType = formData.get("meetingType") as "RADIR" | "RAKORDIR" | "KEPDIR_SIRKULER" | "GRC"

        // Validasi minimal (Contoh)
        if (!title) throw new Error("Judul agenda harus diisi")

        // 3. Simpan ke Database
        await db.insert(agendas).values({
            title,
            urgency: urgency as any,
            deadline: deadline ? new Date(deadline) : null,
            priority: priority as any,
            director,
            initiator,
            support,
            contactPerson,
            position,
            phone,

            // ✅ Kunci: Menggunakan status yang benar
            status: initialStatus,
            meetingType: meetingType,

            // Kolom dokumen (jika ada file diupload, logic upload harusnya sebelum insert ini)
            // ... (Kode upload file Anda sebelumnya ditaruh di sini, atau dikirim path-nya via formData) ...

            createdAt: new Date(),
            updatedAt: new Date(),
        })

        // 4. Revalidate
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