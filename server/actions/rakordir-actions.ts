"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { eq, inArray } from "drizzle-orm"

// ✅ Type-Safety: Menggunakan inferensi tipe dari Drizzle Schema
type NewAgenda = typeof agendas.$inferInsert;
type ExistingAgenda = typeof agendas.$inferSelect;

/**
 * HELPER: Upload file ke bucket 'agenda-attachments'
 */
async function uploadToStorage(file: File, folder: string): Promise<string | null> {
    if (!file || file.size === 0) return null

    try {
        const supabase = await createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${folder}.${fileExt}`
        const bucketId = "agenda-attachments"
        const path = `rakordir/${randomUUID()}/${fileName}`

        console.log(`[DEBUG-STORAGE] Menjalankan upload ke: ${bucketId}/${path}`);

        const { data, error } = await supabase.storage
            .from(bucketId)
            .upload(path, file)

        if (error) {
            console.error(`[STORAGE-ERROR] Gagal upload ${folder}:`, error.message)
            return null
        }
        return data.path
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown storage error"
        console.error(`[STORAGE-CRITICAL] Exception pada upload ${folder}:`, msg)
        return null
    }
}

/**
 * HELPER: Hapus file dari storage untuk cleanup
 */
async function deleteFromStorage(paths: string[]) {
    const validPaths = paths.filter((p) => !!p && p !== "null" && p !== "");
    if (validPaths.length === 0) return;

    try {
        const supabase = await createClient();
        const bucketId = "agenda-attachments";
        console.log(`[DEBUG-CLEANUP] Menghapus ${validPaths.length} file usang dari storage...`);
        await supabase.storage.from(bucketId).remove(validPaths);
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown cleanup error"
        console.error(`[STORAGE-CLEANUP-ERROR] Gagal menghapus file usang:`, msg);
    }
}

/**
 * ACTION: CREATE RAKORDIR
 */
export async function createRakordirAction(formData: FormData) {
    console.log("[DEBUG-ACTION] Memulai Create Rakordir...");
    try {
        const proposalPath = await uploadToStorage(formData.get("proposalNote") as File, "proposal")
        const presentationPath = await uploadToStorage(formData.get("presentationMaterial") as File, "presentation")

        const insertData: NewAgenda = {
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: formData.get("priority") as string, // ✅ Tambah Prioritas
            deadline: new Date(formData.get("deadline") as string),
            director: formData.get("director") as string, // ✅ Simpan String dari Multi-Select
            initiator: formData.get("initiator") as string, // ✅ Simpan String dari Multi-Select
            support: formData.get("support") as string, // ✅ Simpan String dari Multi-Select
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            proposalNote: proposalPath,
            presentationMaterial: presentationPath,
            status: (proposalPath || presentationPath) ? "DAPAT_DILANJUTKAN" : "DRAFT",
            meetingType: "RAKORDIR",
            endTime: "Selesai",
        };

        const [inserted] = await db.insert(agendas).values(insertData).returning({ id: agendas.id });

        console.log(`[DEBUG-SUCCESS] Berhasil membuat agenda ID: ${inserted.id}`);
        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan agenda"
        console.error("[ACTION-CREATE-ERROR]", msg)
        return { success: false, error: msg }
    }
}

/**
 * ACTION: UPDATE RAKORDIR
 */
export async function updateRakordirAction(formData: FormData, id: string) {
    console.log(`[DEBUG-ACTION] Memulai Update Rakordir ID: ${id}`);
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) });
        if (!existing) throw new Error("Agenda tidak ditemukan");

        // Proses File (Upload Baru & Deteksi Hapus)
        const proposalFile = formData.get("proposalNote") as File;
        const presentationFile = formData.get("presentationMaterial") as File;
        const deleteProposal = formData.get("delete_proposalNote") === 'true';
        const deletePresentation = formData.get("delete_presentationMaterial") === 'true';

        let proposalPath = existing.proposalNote;
        let presentationPath = existing.presentationMaterial;

        const filesToRemove: string[] = [];

        // Logika Update Proposal
        if (proposalFile && proposalFile.size > 0) {
            if (existing.proposalNote) filesToRemove.push(existing.proposalNote);
            proposalPath = await uploadToStorage(proposalFile, "proposal");
        } else if (deleteProposal) {
            if (existing.proposalNote) filesToRemove.push(existing.proposalNote);
            proposalPath = null;
        }

        // Logika Update Presentation
        if (presentationFile && presentationFile.size > 0) {
            if (existing.presentationMaterial) filesToRemove.push(existing.presentationMaterial);
            presentationPath = await uploadToStorage(presentationFile, "presentation");
        } else if (deletePresentation) {
            if (existing.presentationMaterial) filesToRemove.push(existing.presentationMaterial);
            presentationPath = null;
        }

        // Cleanup File Usang
        if (filesToRemove.length > 0) await deleteFromStorage(filesToRemove);

        // Eksekusi Update ke Database
        await db.update(agendas).set({
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: formData.get("priority") as string, // ✅ Update Prioritas
            deadline: new Date(formData.get("deadline") as string),
            director: formData.get("director") as string, // ✅ Update Multi-Select String
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            proposalNote: proposalPath,
            presentationMaterial: presentationPath,
            notRequiredFiles: formData.get("notRequiredFiles") as string, // ✅ Simpan status dokumen
            updatedAt: new Date(),
        }).where(eq(agendas.id, id));

        console.log(`[DEBUG-SUCCESS] Berhasil update agenda ID: ${id}`);
        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal update agenda"
        console.error("[ACTION-UPDATE-ERROR]", msg)
        return { success: false, error: msg }
    }
}

/**
 * ACTION: DELETE BULK RAKORDIR
 */
export async function deleteBulkRakordirAction(ids: string[]) {
    console.log(`[DEBUG-ACTION] Memulai Delete Bulk untuk ${ids.length} agenda...`);
    try {
        const items: ExistingAgenda[] = await db.query.agendas.findMany({
            where: inArray(agendas.id, ids),
        });

        const filesToDelete: string[] = [];
        items.forEach(item => {
            if (item.proposalNote) filesToDelete.push(item.proposalNote);
            if (item.presentationMaterial) filesToDelete.push(item.presentationMaterial);

            if (item.supportingDocuments && typeof item.supportingDocuments === 'string') {
                try {
                    const parsed = JSON.parse(item.supportingDocuments);
                    if (Array.isArray(parsed)) {
                        filesToDelete.push(...parsed.map(String));
                    }
                } catch { /* ignore error */ }
            }
        });

        await deleteFromStorage(filesToDelete);
        await db.delete(agendas).where(inArray(agendas.id, ids));

        console.log(`[DEBUG-SUCCESS] Berhasil menghapus ${ids.length} data.`);
        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal hapus massal"
        console.error("[ACTION-DELETE-ERROR]", msg)
        return { success: false, error: msg }
    }
}

/**
 * ACTION: DELETE SINGLE RAKORDIR
 */
export async function deleteRakordirAction(id: string) {
    console.log(`[DEBUG-ACTION] Menghapus Agenda Rakordir ID: ${id}`);
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) });
        if (!existing) throw new Error("Agenda tidak ditemukan");

        // Kumpulkan file untuk dihapus
        const filesToDelete: string[] = [];
        if (existing.proposalNote) filesToDelete.push(existing.proposalNote);
        if (existing.presentationMaterial) filesToDelete.push(existing.presentationMaterial);

        // Hapus file dari storage
        if (filesToDelete.length > 0) await deleteFromStorage(filesToDelete);

        // Hapus dari database
        await db.delete(agendas).where(eq(agendas.id, id));

        revalidatePath("/agenda/rakordir");
        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus agenda";
        console.error("[ACTION-DELETE-ERROR]", msg);
        return { success: false, error: msg };
    }
}