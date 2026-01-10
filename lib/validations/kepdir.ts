// src/lib/validations/kepdir.ts
import * as z from "zod";

/**
 * Zod Schema untuk Validasi Agenda Kepdir Sirkuler
 * Hanya menyertakan field sesuai permintaan:
 * - Judul Agenda
 * - Direktur Pemrakarsa (Multi-select)
 * - Pemrakarsa/Unit (Multi-select)
 * - Narahubung
 * - Jabatan
 * - No HP
 */
export const kepdirSchema = z.object({
    // Judul Agenda
    title: z.string().min(5, {
        message: "Judul agenda minimal 5 karakter",
    }),

    // Direktur Pemrakarsa (Array dari Multi-select)
    director: z.array(z.string()).min(1, {
        message: "Pilih minimal satu Direktur Pemrakarsa",
    }),

    // Pemrakarsa/Unit (Array dari Multi-select)
    initiator: z.array(z.string()).min(1, {
        message: "Pilih minimal satu Unit Pemrakarsa",
    }),

    // Narahubung (Contact Person)
    contactPerson: z.string().min(1, {
        message: "Nama narahubung wajib diisi",
    }),

    // Jabatan Narahubung
    position: z.string().min(1, {
        message: "Jabatan narahubung wajib diisi",
    }),

    // No HP Narahubung
    phone: z.string().min(1, {
        message: "Nomor HP narahubung wajib diisi",
    }),

    /**
     * Status & Metadata Default
     * Ditambahkan untuk konsistensi database meskipun tidak ada di form
     */
    status: z.string().default("Draft"),
});

// Type inference untuk digunakan di React Hook Form
export type KepdirFormValues = z.infer<typeof kepdirSchema>;

/**
 * Helper untuk pengecekan kelengkapan file (Logic di Server Action/Client)
 * Sesuai permintaan dokumen: Kepdir Sirkuler, GRC, dan Pendukung.
 */
export const isKepdirFileComplete = (files: {
    kepdirSirkulerDoc?: File | null;
    grcDoc?: File | null;
}) => {
    return !!(files.kepdirSirkulerDoc && files.grcDoc);
};