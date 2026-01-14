/* eslint-disable @typescript-eslint/no-unused-vars */
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

export async function getSignedFileUrl(path: string | null | undefined) {
    try {
        // 1. Validasi awal: Jika path kosong, langsung kembalikan error yang jelas
        if (!path) {
            return { success: false, error: "Berkas tidak ditemukan atau belum diunggah." };
        }

        // 2. Pastikan user sudah login
        const user = await assertAuthenticated();

        // 3. Bersihkan path (menghilangkan '/' di awal jika ada)
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;

        // 4. Validasi Folder yang diizinkan
        // Jika path Anda menggunakan folder "notulensi/...", tambahkan di sini
        const isAllowed =
            cleanPath.startsWith("radir/") ||
            cleanPath.startsWith("rakordir/") ||
            cleanPath.includes("notulensi/");

        if (!isAllowed) {
            console.error("[SECURITY_WARNING] Percobaan akses path tidak sah:", cleanPath);
            throw new Error("Akses ditolak: Folder file tidak diizinkan.");
        }

        const supabase = await createClient();

        // 5. Buat signed URL
        // PENTING: Pastikan nama bucket "agenda-attachments" sama persis dengan di Supabase Dashboard
        const { data, error } = await supabase.storage
            .from("agenda-attachments")
            .createSignedUrl(cleanPath, 3600); // Expiry 1 jam

        if (error) {
            console.error("[SUPABASE_STORAGE_ERROR]", {
                message: error.message,
                path: cleanPath,
                userId: user.id
            });
            throw new Error(`Gagal akses storage: ${error.message}`);
        }

        if (!data?.signedUrl) {
            throw new Error("Gagal membuat link akses berkas.");
        }

        return {
            success: true,
            url: data.signedUrl,
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menghasilkan link akses file.";

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

/**
 * ACTION: LANJUTKAN AGENDA (RESUME)
 * Mengembalikan status ke DAPAT_DILANJUTKAN dan membersihkan alasan pembatalan/penundaan
 */
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
            cancellationReason: null, // ✅ Bersihkan alasan pembatalan
            postponedReason: null, // ✅ Bersihkan alasan penundaan
            updatedAt: new Date(),
        }).where(eq(agendas.id, id))

        // Revalidasi halaman terkait agar data langsung update di UI
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda/radir");
        revalidatePath("/agenda/rakordir");

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

const postponeSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().min(5, "Alasan penundaan minimal 5 karakter"),
});

/**
 * ACTION: TUNDA AGENDA
 * Mengubah status menjadi DITUNDA dan menyimpan alasannya ke kolom postponedReason
 */
export async function postponeAgendaAction(data: z.infer<typeof postponeSchema>) {
    try {
        // Validasi input menggunakan Zod
        const validated = postponeSchema.parse(data);

        // Cek login & pastikan data ada
        await assertAgendaExists(validated.id);

        await db.update(agendas).set({
            status: "DITUNDA",
            postponedReason: validated.reason, // ✅ Simpan ke kolom khusus
            updatedAt: new Date(),
        }).where(eq(agendas.id, validated.id));

        // Revalidasi halaman terkait agar data langsung update di UI
        revalidatePath("/agenda-siap/radir");
        revalidatePath("/agenda/radir");
        revalidatePath("/agenda/rakordir");

        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menunda agenda.";
        console.error("[POSTPONE_AGENDA_ERROR]:", msg);
        return { success: false, error: msg };
    }
}


export async function uploadAgendaFileAction(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        const agendaId = formData.get("agendaId") as string;
        const fileType = formData.get("fileType") as string;

        if (!file || !agendaId) return { success: false, error: "Data tidak lengkap" };

        const supabase = await createClient(); // Pastikan utility createClient sudah benar

        // 1. BUAT PATH FILE
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const filePath = `rakordir/notulensi/${agendaId}/${fileName}`;

        // 2. UNGGAH KE SUPABASE STORAGE (Penting!)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("agenda-attachments") // Pastikan nama bucket ini sama di Supabase dashboard
            .upload(filePath, file);

        if (uploadError) {
            console.error("Storage Upload Error:", uploadError);
            return { success: false, error: `Gagal upload ke storage: ${uploadError.message}` };
        }

        // 3. UPDATE DATABASE (Hanya jika upload sukses)
        await db.update(agendas)
            .set({
                risalahTtd: filePath,
                status: "RAPAT_SELESAI",
                updatedAt: new Date()
            })
            .where(eq(agendas.id, agendaId));

        revalidatePath("/pelaksanaan-rapat/rakordir");
        return { success: true, path: filePath };

    } catch (error) {
        console.error("Server Action Error:", error);
        return { success: false, error: "Terjadi kesalahan internal" };
    }
}


// server/actions/agenda-actions.ts

export async function deleteFinalMinutesAction(agendaId: string) {
    try {
        // 1. Ambil data agenda terlebih dahulu untuk mendapatkan PATH file-nya
        const agenda = await db.query.agendas.findFirst({
            where: eq(agendas.id, agendaId),
            columns: {
                risalahTtd: true,
            },
        });

        const filePath = agenda?.risalahTtd;

        // 2. Jika ada path file, hapus file fisik di Supabase Bucket
        if (filePath) {
            const supabase = await createClient();

            // Bersihkan path jika ada '/' di awal
            const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

            const { error: storageError } = await supabase.storage
                .from("agenda-attachments") // Pastikan nama bucket sesuai
                .remove([cleanPath]); // Remove menerima array of paths

            if (storageError) {
                console.error("[STORAGE_DELETE_ERROR]", storageError);
                // Kita lanjutkan tetap hapus di DB atau throw error tergantung kebijakan Anda
                // Biasanya kita lanjut agar DB tetap bersih jika file fisik sudah "hilang" duluan
            } else {
                console.log("[STORAGE_DELETE_SUCCESS] File terhapus:", cleanPath);
            }
        }

        // 3. Update database: Set risalahTtd ke NULL dan kembalikan status
        await db.update(agendas)
            .set({
                risalahTtd: null,
                status: "DIJADWALKAN", // Kembalikan agar bisa diupload ulang
                updatedAt: new Date()
            })
            .where(eq(agendas.id, agendaId));

        // 4. Revalidasi halaman agar UI berubah
        revalidatePath("/pelaksanaan-rapat/rakordir");

        return { success: true, message: "Notulensi fisik dan data berhasil dihapus" };
    } catch (error) {
        console.error("Delete Action Error:", error);
        return { success: false, error: "Gagal menghapus notulensi" };
    }
}