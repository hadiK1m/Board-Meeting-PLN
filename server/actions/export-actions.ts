"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and } from "drizzle-orm"
import fs from "fs"
import path from "path"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import { format } from "date-fns"
import { id } from "date-fns/locale"

/**
 * HELPER: Mengonversi angka menjadi kata terbilang Indonesia
 */
function terbilang(n: number): string {
    if (n === 0) return "nol";
    const ambil = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    if (n < 12) return ambil[n];
    if (n < 20) return terbilang(n - 10) + " belas";
    if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh " + (n % 10 !== 0 ? terbilang(n % 10) : "");
    return String(n);
}

/**
 * HELPER: Mengonversi angka menjadi Romawi Kecil (i, ii, iii, iv, dst.)
 */
function toRoman(num: number): string {
    const lookup: { [key: string]: number } = { x: 10, ix: 9, v: 5, iv: 4, i: 1 };
    let roman = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

/**
 * HELPER: Membersihkan tag HTML agar teks rapi di MS Word.
 */
function cleanHtml(html: string) {
    if (!html) return "-";
    return html
        .replace(/<\/p>/g, "\n")
        .replace(/<li>/g, "• ")
        .replace(/<\/li>/g, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();
}

/**
 * ACTION UTAMA: Export Risalah ke format DOCX
 */
export async function exportRisalahToDocx(meetingNumber: string, meetingYear: string) {
    // 1. Validasi Input agar tidak undefined
    const safeNumber = meetingNumber || "000";
    const safeYear = meetingYear || new Date().getFullYear().toString();

    console.log(`[EXPORT-LOG] Memproses Risalah No: ${safeNumber}, Tahun: ${safeYear}`);

    try {
        // 2. Query Database
        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, safeNumber),
                eq(agendas.meetingYear, safeYear)
            ),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)]
        });

        if (!dataAgendas || dataAgendas.length === 0) {
            return {
                success: false,
                error: `Data tidak ditemukan untuk No: ${safeNumber} / ${safeYear}. Pastikan sudah menekan tombol SIMPAN.`
            };
        }

        // 3. Persiapan Template
        const templatePath = path.resolve(process.cwd(), "public", "1.2 Radir_Lembar Isi.docx");
        if (!fs.existsSync(templatePath)) {
            throw new Error("File template '1.2 Radir_Lembar Isi.docx' tidak ditemukan di folder public.");
        }

        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        const firstAgenda = dataAgendas[0];
        const executionDate = firstAgenda.executionDate ? new Date(firstAgenda.executionDate) : new Date();

        // 4. Proses Kehadiran Direksi
        let attendance = firstAgenda.attendanceData;
        if (typeof attendance === "string") {
            try { attendance = JSON.parse(attendance); } catch { attendance = {}; }
        }

        const direkturList = attendance ? Object.keys(attendance as object) : [];
        const totalCount = direkturList.length > 0 ? direkturList.length : 11;
        const hadirCount = direkturList.length > 0
            ? direkturList.filter(d => (attendance as any)[d].status === "Hadir" || (attendance as any)[d].status === "Kuasa").length
            : totalCount;

        const catatanKehadiran = direkturList
            .filter(d => (attendance as any)[d].status === "Tidak Hadir" || (attendance as any)[d].status === "Kuasa")
            .map(d => {
                const info = (attendance as any)[d];
                if (info.status === "Kuasa") {
                    const penerima = info.proxy && info.proxy.length > 0 ? info.proxy[0].label : "Direktur terkait";
                    return `• ${d} tidak hadir dan memberikan kuasa kepada ${penerima}`;
                }
                return `• ${d} tidak hadir (Keterangan: ${info.reason || "-"})`;
            }).join("\n");

        // 5. Proses Tamu / MAK / MA
        const guests = (firstAgenda.guestParticipants as any[]) || [];
        const tamuListText = guests.length > 0
            ? guests.map(g => `• ${g.name} (${g.position})`).join("\n")
            : "Tidak ada manajemen lain yang hadir.";

        // 6. Susun Data untuk Template (Mapping)
        const templateData = {
            meetingNumber: safeNumber,
            meetingYear: safeYear,
            day: format(executionDate, "eeee", { locale: id }),
            date: format(executionDate, "dd MMMM yyyy", { locale: id }),
            startTime: firstAgenda.startTime || "09.00",
            endTime: firstAgenda.endTime || "Selesai",
            location: firstAgenda.meetingLocation || "Ruang Rapat Direksi",

            // Format: 11 (sebelas)
            jumlah_hadir: `${hadirCount} (${terbilang(hadirCount)})`,
            total_direktur: `${totalCount} (${terbilang(totalCount)})`,

            pimpinan_rapat: Array.isArray(firstAgenda.pimpinanRapat)
                ? (firstAgenda.pimpinanRapat as any[]).map(p => p.label).join(", ")
                : "Direktur Utama",

            catatan_kehadiran: catatanKehadiran || "Seluruh Direksi hadir lengkap.",
            tamu_list_text: tamuListText,

            // Daftar Agenda i, ii, iii
            agenda_list_text: dataAgendas.map((a, idx) => {
                const roman = toRoman(idx + 1);
                const sep = (idx === dataAgendas.length - 1) ? "" : ";";
                return `${roman}) ${a.title} (Pemrakarsa: ${a.director})${sep}`;
            }).join("\n"),

            // Loop Konten Detil Agenda
            agendas: dataAgendas.map((a, index) => ({
                index: index + 1,
                title: a.title,
                director: a.director,
                executiveSummary: cleanHtml(a.executiveSummary || ""),
                considerations: cleanHtml(a.considerations || ""),
                meetingDecisions: Array.isArray(a.meetingDecisions)
                    ? (a.meetingDecisions as any[]).map((d, i) => `${i + 1}. ${d.text}`).join("\n")
                    : cleanHtml(String(a.meetingDecisions || "-")),
                dissentingOpinion: a.dissentingOpinion || "Tidak ada"
            }))
        };

        // 7. Render & Generate
        doc.render(templateData);
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });

        return {
            success: true,
            filename: `Risalah_RADIR_No_${safeNumber}_${safeYear}.docx`,
            data: buf.toString("base64")
        };

    } catch (error: any) {
        console.error("[EXPORT-ERROR]:", error.message);
        return { success: false, error: error.message };
    }
}