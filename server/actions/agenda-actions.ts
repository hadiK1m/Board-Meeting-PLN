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