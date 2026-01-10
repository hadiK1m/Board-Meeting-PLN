import { z } from "zod";

/**
 * Schema validasi untuk Form Usulan Agenda Radir.
 * Menggunakan pendekatan fleksibel untuk mendukung fitur "Draft" vs "Lanjutkan Rapat".
 */
export const agendaFormSchema = z.object({
    // Identitas Agenda
    title: z.string().min(5, {
        message: "Judul agenda minimal 5 karakter",
    }),
    description: z.string().min(10, {
        message: "Deskripsi/Latar belakang minimal 10 karakter",
    }),

    // Master Data (Disesuaikan dengan lib/MasterData.ts)
    category: z.string().min(1, { message: "Pilih kategori agenda" }),
    priority: z.string().min(1, { message: "Pilih skala prioritas" }),
    departmentId: z.string().min(1, { message: "Pilih departemen pengusul" }),

    // Logika File (Dokumen)
    // File ditandai sebagai any/optional karena validasi 'required' 
    // akan dilakukan secara logic di UI dan Server Action berdasarkan 'notRequiredFiles'
    documentFile: z.any().optional(),
    presentationFile: z.any().optional(),

    /**
     * Field untuk menyimpan daftar field file yang ditandai "Tidak Diperlukan" oleh user.
     * Contoh isi: ["documentFile"] atau ["documentFile", "presentationFile"]
     */
    notRequiredFiles: z.array(z.string()).default([]),

    /**
     * Status Agenda: 'Draft' atau 'Dapat Dilanjutkan'
     * Nilai ini akan dihitung di Server Action, namun didefinisikan di schema untuk konsistensi.
     */
    status: z.enum(["Draft", "Dapat Dilanjutkan"]).default("Draft"),
});

// Type inference untuk digunakan di UI Components (React Hook Form)
export type AgendaFormInput = z.infer<typeof agendaFormSchema>;

/**
 * Helper function untuk mengecek apakah sebuah agenda sudah memenuhi syarat 
 * untuk status "Dapat Dilanjutkan" (Semua file ada atau ditandai tidak perlu).
 */
export const isAgendaComplete = (data: Partial<AgendaFormInput>) => {
    const requiredFiles = ["documentFile", "presentationFile"];

    return requiredFiles.every((field) => {
        const hasFile = data[field as keyof AgendaFormInput] !== undefined &&
            data[field as keyof AgendaFormInput] !== null;
        const isNotRequired = data.notRequiredFiles?.includes(field);

        return hasFile || isNotRequired;
    });
};