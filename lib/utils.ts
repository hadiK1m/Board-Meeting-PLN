import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mengubah HTML dari editor menjadi teks biasa yang rapi untuk Docx.
 * Mengubah <p>, <br>, <li> menjadi baris baru agar tidak dempet.
 */
export function formatHtmlToDocxText(html: string | null | undefined): string {
  if (!html) return "";

  let text = html;

  // 1. Ganti paragraf penutup dan break line dengan Newline (Enter)
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // 2. Ganti List Item (<li>) menjadi baris baru dengan strip (-)
  // Catatan: Ini mengubah angka (1. 2. 3.) menjadi strip (-) agar rapi di Word teks biasa.
  text = text.replace(/<li>/gi, "\n- ");
  text = text.replace(/<\/li>/gi, "");

  // 3. Ganti penutup </ul> atau </ol> dengan extra newline untuk jarak
  text = text.replace(/<\/(ul|ol)>/gi, "\n");

  // 4. Hapus semua tag HTML sisanya (seperti <strong>, <em>, <div>, dll)
  text = text.replace(/<[^>]+>/g, "");

  // 5. Decode karakter spesial HTML (seperti &nbsp; menjadi spasi)
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // 6. Rapikan spasi berlebih di awal/akhir
  return text.trim();
}