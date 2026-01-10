"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

/**
 * HELPER: Upload file ke bucket 'agenda-attachments'
 */
async function uploadToStorage(file: File, folder: string, userId: string): Promise<string | null> {
    if (!file || file.size === 0) return null

    try {
        const supabase = await createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${folder}.${fileExt}`
        const bucketId = "agenda-attachments"
        // Menggunakan userId dan randomUUID untuk path yang unik
        const path = `rakordir/${userId}/${randomUUID()}/${fileName}`

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
 * HELPER: Hapus file dari storage
 */
async function deleteFromStorage(paths: string[]) {
    const validPaths = paths.filter((p) => !!p && p !== "null" && p !== "");
    if (validPaths.length === 0) return;

    try {
        const supabase = await createClient();
        const bucketId = "agenda-attachments";
        await supabase.storage.from(bucketId).remove(validPaths);
    } catch (error) {
        console.error(`[STORAGE-CLEANUP-ERROR] Gagal menghapus file:`, error);
    }
}

/**
 * 1. ACTION: CREATE RAKORDIR
 */
export async function createRakordirAction(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: "Sesi kadaluarsa." }

        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : []

        // 1. Log data awal untuk analisa
        console.log("[DEBUG] Memproses Form Rakordir untuk Title:", formData.get("title"));

        // Helper upload sederhana
        const upload = async (fieldName: string) => {
            const file = formData.get(fieldName) as File
            if (!file || file.size === 0) return null
            const path = `rakordir/${user.id}/${randomUUID()}-${file.name}`
            const { data } = await supabase.storage.from('agenda-attachments').upload(path, file)
            return data?.path || null
        }

        const proposalPath = await upload("proposalNote")
        const presentationPath = await upload("presentationMaterial")

        const isProposalOk = proposalPath !== null || notRequiredFiles.includes("proposalNote");
        const isPresentationOk = presentationPath !== null || notRequiredFiles.includes("presentationMaterial");
        const finalStatus = (isProposalOk && isPresentationOk) ? "DAPAT_DILANJUTKAN" : "DRAFT";

        // 2. KONSTRUKSI DATA EKSPLISIT (Sesuai db/schema/agendas.ts)
        const insertData: any = {
            title: formData.get("title") as string,
            urgency: (formData.get("urgency") as string) || "Biasa",
            deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
            priority: (formData.get("priority") as string) || "Low",
            director: (formData.get("director") as string) || "DIRUT",
            initiator: (formData.get("initiator") as string) || "PLN",
            support: (formData.get("support") as string) || "",
            contactPerson: (formData.get("contactPerson") as string) || "",
            position: (formData.get("position") as string) || "",
            phone: (formData.get("phone") as string) || "",

            // Set null untuk field Radir agar tidak bergeser
            legalReview: null,
            riskReview: null,
            complianceReview: null,
            regulationReview: null,
            recommendationNote: null,

            proposalNote: proposalPath,
            presentationMaterial: presentationPath,
            supportingDocuments: [],

            notRequiredFiles: notRequiredFiles,
            status: finalStatus,
            meetingType: "RAKORDIR",
            meetingStatus: "PENDING",
            endTime: "Selesai"
        };

        // 3. Log data sebelum insert untuk verifikasi akhir
        console.log("[DEBUG] Objek InsertData siap dikirim ke DB");

        await db.insert(agendas).values(insertData);

        revalidatePath("/agenda/rakordir");
        return { success: true };
    } catch (error: any) {
        console.error("[CRITICAL-ERROR] Gagal Insert Rakordir:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 2. ACTION: UPDATE RAKORDIR
 */
export async function updateRakordirAction(id: string, formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Sesi kadaluarsa." }

        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) });
        if (!existing) throw new Error("Agenda tidak ditemukan");

        const notRequiredRaw = formData.get("notRequiredFiles") as string
        const notRequiredFiles = notRequiredRaw ? JSON.parse(notRequiredRaw) : []

        // File Update Logic
        const proposalFile = formData.get("proposalNote") as File;
        const presentationFile = formData.get("presentationMaterial") as File;

        let proposalPath = existing.proposalNote;
        let presentationPath = existing.presentationMaterial;
        const filesToRemove: string[] = [];

        // Jika ada file baru diunggah, hapus file lama dari storage
        if (proposalFile && proposalFile.size > 0) {
            if (existing.proposalNote) filesToRemove.push(existing.proposalNote);
            proposalPath = await uploadToStorage(proposalFile, "proposal", user.id);
        }

        if (presentationFile && presentationFile.size > 0) {
            if (existing.presentationMaterial) filesToRemove.push(existing.presentationMaterial);
            presentationPath = await uploadToStorage(presentationFile, "presentation", user.id);
        }

        if (filesToRemove.length > 0) await deleteFromStorage(filesToRemove);

        // Re-kalkulasi status
        const isProposalOk = proposalPath !== null || notRequiredFiles.includes("proposalNote");
        const isPresentationOk = presentationPath !== null || notRequiredFiles.includes("presentationMaterial");
        const finalStatus = (isProposalOk && isPresentationOk) ? "DAPAT_DILANJUTKAN" : "DRAFT";

        // Update Database menggunakan set secara eksplisit
        await db.update(agendas).set({
            title: (formData.get("title") as string) || existing.title,
            priority: (formData.get("priority") as string) || existing.priority,
            director: (formData.get("director") as string) || existing.director,
            initiator: (formData.get("initiator") as string) || existing.initiator,
            contactPerson: (formData.get("contactPerson") as string) || existing.contactPerson,
            position: (formData.get("position") as string) || existing.position,
            phone: (formData.get("phone") as string) || existing.phone,
            urgency: (formData.get("urgency") as string) || existing.urgency,
            deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : existing.deadline,
            proposalNote: proposalPath,
            presentationMaterial: presentationPath,
            notRequiredFiles: notRequiredFiles,
            status: finalStatus,
            updatedAt: new Date(),
        }).where(eq(agendas.id, id));

        revalidatePath("/agenda/rakordir");
        revalidatePath("/agenda-siap/rakordir");

        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal update agenda";
        console.error("[ACTION-UPDATE-ERROR] Detail:", msg);
        return { success: false, error: msg };
    }
}

/**
 * 3. ACTION: DELETE RAKORDIR
 */
export async function deleteRakordirAction(id: string) {
    try {
        const existing = await db.query.agendas.findFirst({ where: eq(agendas.id, id) });
        if (!existing) throw new Error("Agenda tidak ditemukan");

        // Bersihkan file di storage sebelum hapus record
        const filesToDelete: string[] = [];
        if (existing.proposalNote) filesToDelete.push(existing.proposalNote);
        if (existing.presentationMaterial) filesToDelete.push(existing.presentationMaterial);

        if (filesToDelete.length > 0) await deleteFromStorage(filesToDelete);

        await db.delete(agendas).where(eq(agendas.id, id));

        revalidatePath("/agenda/rakordir");
        revalidatePath("/agenda-siap/rakordir");

        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus agenda";
        console.error("[ACTION-DELETE-ERROR] Detail:", msg);
        return { success: false, error: msg };
    }
}