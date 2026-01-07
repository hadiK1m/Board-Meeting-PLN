"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { eq, inArray } from "drizzle-orm"

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
    } catch (e) {
        console.error(`[STORAGE-CRITICAL] Exception pada upload ${folder}:`, e)
        return null
    }
}

/**
 * HELPER: Hapus file dari storage untuk cleanup
 */
async function deleteFromStorage(paths: (string | null | undefined)[]) {
    const validPaths = paths.filter((p): p is string => !!p && p !== "null" && p !== "");
    if (validPaths.length === 0) return;

    try {
        const supabase = await createClient();
        const bucketId = "agenda-attachments";
        console.log(`[DEBUG-CLEANUP] Menghapus ${validPaths.length} file usang dari storage...`);
        await supabase.storage.from(bucketId).remove(validPaths);
    } catch (e) {
        console.error(`[STORAGE-CLEANUP-ERROR] Gagal menghapus file usang:`, e);
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

        const [inserted] = await db.insert(agendas).values({
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
        } as any).returning({ id: agendas.id })

        console.log(`[DEBUG-SUCCESS] Berhasil membuat agenda ID: ${inserted.id}`);
        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-CREATE-ERROR]", error.message)
        return { success: false, error: error.message }
    }
}

/**
 * ACTION: UPDATE RAKORDIR (With Storage Cleanup)
 */
export async function updateRakordirAction(formData: FormData, id: string) {
    console.log(`[DEBUG-ACTION] Memulai Update Rakordir ID: ${id}`);
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) });
        if (!existing) throw new Error("Agenda tidak ditemukan");

        // Proses upload file baru
        const newProposalFile = formData.get("proposalNote") as File;
        const newPresentationFile = formData.get("presentationMaterial") as File;

        const newProposalPath = await uploadToStorage(newProposalFile, "proposal");
        const newPresentationPath = await uploadToStorage(newPresentationFile, "presentation");

        // Logic Cleanup: Jika ada file baru, hapus file lama dari storage
        const filesToDelete: string[] = [];
        if (newProposalPath && (existing as any).proposalNote) {
            filesToDelete.push((existing as any).proposalNote);
        }
        if (newPresentationPath && (existing as any).presentationMaterial) {
            filesToDelete.push((existing as any).presentationMaterial);
        }

        if (filesToDelete.length > 0) {
            await deleteFromStorage(filesToDelete);
        }

        // Jalankan Update
        await db.update(agendas).set({
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            deadline: new Date(formData.get("deadline") as string),
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            // Jika tidak ada upload baru, tetap gunakan path yang lama
            proposalNote: newProposalPath || (existing as any).proposalNote,
            presentationMaterial: newPresentationPath || (existing as any).presentationMaterial,
            updatedAt: new Date(),
        } as any).where(eq(agendas.id, id));

        console.log(`[DEBUG-SUCCESS] Berhasil update agenda ID: ${id}`);
        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-UPDATE-ERROR]", error.message)
        return { success: false, error: error.message }
    }
}

/**
 * ACTION: DELETE BULK RAKORDIR (With Storage Cleanup)
 */
export async function deleteBulkRakordirAction(ids: string[]) {
    console.log(`[DEBUG-ACTION] Memulai Delete Bulk untuk ${ids.length} agenda...`);
    try {
        // 1. Ambil list file untuk dihapus dari storage
        const items = await db.query.agendas.findMany({
            where: inArray(agendas.id, ids),
            columns: {
                proposalNote: true,
                presentationMaterial: true,
                supportingDocuments: true,
            }
        });

        const filesToDelete: string[] = [];
        items.forEach(item => {
            if (item.proposalNote) filesToDelete.push(item.proposalNote);
            if (item.presentationMaterial) filesToDelete.push(item.presentationMaterial);

            // Handle supporting documents (JSON string)
            if (item.supportingDocuments) {
                try {
                    const parsed = JSON.parse(item.supportingDocuments);
                    if (Array.isArray(parsed)) filesToDelete.push(...parsed);
                } catch (e) { /* ignore parse error */ }
            }
        });

        // 2. Cleanup Storage
        await deleteFromStorage(filesToDelete);

        // 3. Delete DB
        await db.delete(agendas).where(inArray(agendas.id, ids));

        console.log(`[DEBUG-SUCCESS] Berhasil menghapus ${ids.length} data dan filenya.`);
        revalidatePath("/agenda/rakordir")
        return { success: true }
    } catch (error: any) {
        console.error("[ACTION-DELETE-ERROR]", error.message)
        return { success: false, error: error.message }
    }
}