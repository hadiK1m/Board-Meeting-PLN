"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { eq, inArray } from "drizzle-orm"

// ✅ Menghilangkan 'any' dengan inferensi tipe dari Drizzle
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

        // ✅ Mapping data secara eksplisit menggunakan tipe NewAgenda
        const insertData: NewAgenda = {
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            deadline: new Date(formData.get("deadline") as string),
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            priority: formData.get("priority") as string,
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

        const newProposalFile = formData.get("proposalNote") as File;
        const newPresentationFile = formData.get("presentationMaterial") as File;

        const newProposalPath = await uploadToStorage(newProposalFile, "proposal");
        const newPresentationPath = await uploadToStorage(newPresentationFile, "presentation");

        const filesToDelete: string[] = [];
        if (newProposalPath && existing.proposalNote) {
            filesToDelete.push(existing.proposalNote);
        }
        if (newPresentationPath && existing.presentationMaterial) {
            filesToDelete.push(existing.presentationMaterial);
        }

        if (filesToDelete.length > 0) {
            await deleteFromStorage(filesToDelete);
        }

        // ✅ Update dengan tipe partial dari NewAgenda
        await db.update(agendas).set({
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            deadline: new Date(formData.get("deadline") as string),
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            proposalNote: newProposalPath || existing.proposalNote,
            presentationMaterial: newPresentationPath || existing.presentationMaterial,
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

            // ✅ Fix Error TS2345: Memastikan argument JSON.parse adalah string
            if (item.supportingDocuments && typeof item.supportingDocuments === 'string') {
                try {
                    const parsed = JSON.parse(item.supportingDocuments);
                    if (Array.isArray(parsed)) {
                        filesToDelete.push(...parsed.map(String));
                    }
                } catch {
                    // ignore error
                }
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