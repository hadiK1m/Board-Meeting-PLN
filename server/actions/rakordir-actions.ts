"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

// ✅ Type-Safety: Menggunakan inferensi tipe dari Drizzle Schema
type NewAgenda = typeof agendas.$inferInsert;

/**
 * HELPER: Upload file ke bucket 'agenda-attachments'
 * Khusus digunakan untuk modul Rakordir
 */
async function uploadToStorage(file: File, folder: string): Promise<string | null> {
    if (!file || file.size === 0) return null

    try {
        const supabase = await createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${folder}.${fileExt}`
        const bucketId = "agenda-attachments"
        const path = `rakordir/${randomUUID()}/${fileName}`

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
 * HELPER: Hapus file dari storage untuk cleanup internal modul
 */
async function deleteFromStorage(paths: string[]) {
    const validPaths = paths.filter((p) => !!p && p !== "null" && p !== "");
    if (validPaths.length === 0) return;

    try {
        const supabase = await createClient();
        const bucketId = "agenda-attachments";
        await supabase.storage.from(bucketId).remove(validPaths);
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown cleanup error"
        console.error(`[STORAGE-CLEANUP-ERROR] Gagal menghapus file:`, msg);
    }
}

/**
 * 1. ACTION: CREATE RAKORDIR
 * Menangani usulan Rapat Koordinasi Direksi baru.
 */
export async function createRakordirAction(formData: FormData) {
    try {
        // 1. Ambil Data Status dan Not Required dari Client
        // Status sudah ditentukan di modal (DRAFT / DAPAT_DILANJUTKAN)
        const status = formData.get("status") as string;
        const notRequiredFiles = formData.get("notRequiredFiles") as string;

        // 2. Proses Upload File (Gunakan pengecekan size agar tidak upload file kosong)
        const proposalFile = formData.get("proposalNote") as File;
        const presentationFile = formData.get("presentationMaterial") as File;

        let proposalPath = null;
        let presentationPath = null;

        if (proposalFile && proposalFile.size > 0) {
            proposalPath = await uploadToStorage(proposalFile, "proposal");
        }

        if (presentationFile && presentationFile.size > 0) {
            presentationPath = await uploadToStorage(presentationFile, "presentation");
        }

        // 3. Susun Data untuk Insert
        const insertData: NewAgenda = {
            title: formData.get("title") as string,
            urgency: formData.get("urgency") as string,
            priority: formData.get("priority") as string,
            deadline: new Date(formData.get("deadline") as string),
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            proposalNote: proposalPath,
            presentationMaterial: presentationPath,
            // Simpan daftar dokumen yang ditandai "Tidak Diperlukan"
            notRequiredFiles: notRequiredFiles,
            // Gunakan status yang dikirim dari Modal (isComplete logic)
            status: status || "DRAFT",
            meetingType: "RAKORDIR",
            endTime: "Selesai",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // 4. Eksekusi ke Database
        await db.insert(agendas).values(insertData);

        // 5. Revalidate agar data muncul di halaman terkait
        revalidatePath("/agenda/rakordir");
        revalidatePath("/agenda-siap/rakordir");

        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan agenda";
        console.error("[ACTION-CREATE-ERROR]", msg);
        return { success: false, error: msg };
    }
}
/**
 * 2. ACTION: UPDATE RAKORDIR
 * Menangani pembaruan data dan penggantian dokumen fisik.
 */
export async function updateRakordirAction(formData: FormData, id: string) {
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) });
        if (!existing) throw new Error("Agenda tidak ditemukan");

        // ✅ Ambil status dari formData yang dikirim client
        const status = formData.get("status") as string;

        const proposalFile = formData.get("proposalNote") as File;
        const presentationFile = formData.get("presentationMaterial") as File;
        const deleteProposal = formData.get("delete_proposalNote") === 'true';
        const deletePresentation = formData.get("delete_presentationMaterial") === 'true';

        let proposalPath = existing.proposalNote;
        let presentationPath = existing.presentationMaterial;
        const filesToRemove: string[] = [];

        // Update Proposal Note
        if (proposalFile && proposalFile.size > 0) {
            if (existing.proposalNote) filesToRemove.push(existing.proposalNote);
            proposalPath = await uploadToStorage(proposalFile, "proposal");
        } else if (deleteProposal) {
            if (existing.proposalNote) filesToRemove.push(existing.proposalNote);
            proposalPath = null;
        }

        // Update Presentation Material
        if (presentationFile && presentationFile.size > 0) {
            if (existing.presentationMaterial) filesToRemove.push(existing.presentationMaterial);
            presentationPath = await uploadToStorage(presentationFile, "presentation");
        } else if (deletePresentation) {
            if (existing.presentationMaterial) filesToRemove.push(existing.presentationMaterial);
            presentationPath = null;
        }

        if (filesToRemove.length > 0) await deleteFromStorage(filesToRemove);

        // ✅ Lakukan Update ke Database
        await db.update(agendas).set({
            title: formData.get("title") as string,
            status: status, // 👈 INI POIN PENTINGNYA: Menyimpan status baru (DRAFT / DAPAT_DILANJUTKAN)
            urgency: formData.get("urgency") as string,
            priority: formData.get("priority") as string,
            deadline: new Date(formData.get("deadline") as string),
            director: formData.get("director") as string,
            initiator: formData.get("initiator") as string,
            support: formData.get("support") as string,
            contactPerson: formData.get("contactPerson") as string,
            position: formData.get("position") as string,
            phone: formData.get("phone") as string,
            proposalNote: proposalPath,
            presentationMaterial: presentationPath,
            notRequiredFiles: formData.get("notRequiredFiles") as string,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id));

        // ✅ Revalidate Path agar UI segera berubah
        revalidatePath("/agenda/rakordir");
        revalidatePath("/agenda-siap/rakordir"); // Tambahkan ini agar halaman Siap Rakordir juga terupdate

        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal update agenda";
        console.error("[ACTION-UPDATE-ERROR]", msg);
        return { success: false, error: msg };
    }
}

/**
 * 3. ACTION: DELETE SINGLE RAKORDIR
 */
export async function deleteRakordirAction(id: string) {
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) });
        if (!existing) throw new Error("Agenda tidak ditemukan");

        const filesToDelete: string[] = [];
        if (existing.proposalNote) filesToDelete.push(existing.proposalNote);
        if (existing.presentationMaterial) filesToDelete.push(existing.presentationMaterial);

        if (filesToDelete.length > 0) await deleteFromStorage(filesToDelete);

        await db.delete(agendas).where(eq(agendas.id, id));

        revalidatePath("/agenda/rakordir");
        revalidatePath("/agenda-siap/radir");
        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus agenda";
        console.error("[ACTION-DELETE-ERROR]", msg);
        return { success: false, error: msg };
    }
}