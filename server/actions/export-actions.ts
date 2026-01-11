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
 * HELPER: Mengonversi angka menjadi Romawi Kecil
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
        .replace(/<br\s*\/?>/g, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();
}

/**
 * ACTION: Export Risalah RADIR ke format DOCX
 */
export async function exportRisalahToDocx(meetingNumber: string, meetingYear: string) {
    const safeNumber = meetingNumber || "000";
    const safeYear = meetingYear || new Date().getFullYear().toString();

    try {
        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, safeNumber),
                eq(agendas.meetingYear, safeYear)
            ),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)]
        });

        if (!dataAgendas || dataAgendas.length === 0) {
            return { success: false, error: `Data tidak ditemukan untuk No: ${safeNumber} / ${safeYear}.` };
        }

        const templatePath = path.resolve(process.cwd(), "public", "1.2 Radir_Lembar Isi.docx");
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const firstAgenda = dataAgendas[0];
        const executionDate = firstAgenda.executionDate ? new Date(firstAgenda.executionDate) : new Date();

        let attendance = firstAgenda.attendanceData;
        if (typeof attendance === "string") {
            try { attendance = JSON.parse(attendance); } catch { attendance = {}; }
        }

        const direkturList = attendance ? Object.keys(attendance as object) : [];
        const totalCount = direkturList.length > 0 ? direkturList.length : 11;
        const hadirCount = direkturList.filter(d => (attendance as any)[d].status === "Hadir" || (attendance as any)[d].status === "Kuasa").length;

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

        const templateData = {
            meetingNumber: safeNumber,
            meetingYear: safeYear,
            day: format(executionDate, "eeee", { locale: id }),
            date: format(executionDate, "dd MMMM yyyy", { locale: id }),
            startTime: firstAgenda.startTime || "09.00",
            endTime: firstAgenda.endTime || "Selesai",
            location: firstAgenda.meetingLocation || "Ruang Rapat Direksi",
            jumlah_hadir: `${hadirCount} (${terbilang(hadirCount)})`,
            total_direktur: `${totalCount} (${terbilang(totalCount)})`,
            pimpinan_rapat: Array.isArray(firstAgenda.pimpinanRapat)
                ? (firstAgenda.pimpinanRapat as any[]).map(p => p.label).join(", ")
                : "Direktur Utama",
            catatan_kehadiran: catatanKehadiran || "Seluruh Direksi hadir lengkap.",
            agendas: dataAgendas.map((a, index) => ({
                index: index + 1,
                title: a.title,
                director: a.director,
                executiveSummary: cleanHtml(a.executiveSummary || ""),
                meetingDecisions: Array.isArray(a.meetingDecisions)
                    ? (a.meetingDecisions as any[]).map((d, i) => `${i + 1}. ${d.text}`).join("\n")
                    : cleanHtml(String(a.meetingDecisions || "-")),
            }))
        };

        doc.render(templateData);
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });

        return {
            success: true,
            filename: `Risalah_RADIR_No_${safeNumber}_${safeYear}.docx`,
            data: buf.toString("base64")
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * ACTION: Export Notulensi RAKORDIR ke format DOCX
 */
export async function exportRakordirToDocx(meetingNumber: string, meetingYear: string) {
    const safeNumber = meetingNumber || "000";
    const safeYear = meetingYear || new Date().getFullYear().toString();

    try {
        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, safeNumber),
                eq(agendas.meetingYear, safeYear),
                eq(agendas.meetingType, "RAKORDIR")
            ),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)]
        });

        if (!dataAgendas || dataAgendas.length === 0) {
            return { success: false, error: "Data Rakordir tidak ditemukan." };
        }

        const templatePath = path.resolve(process.cwd(), "public", "2. Template Notulensi Rakordir.docx");
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const firstAgenda = dataAgendas[0];
        const executionDate = firstAgenda.executionDate ? new Date(firstAgenda.executionDate) : new Date();

        // 1. Logika Kehadiran
        let attendance = firstAgenda.attendanceData;
        if (typeof attendance === "string") {
            try { attendance = JSON.parse(attendance); } catch { attendance = {}; }
        }
        const direkturList = attendance ? Object.keys(attendance as object) : [];
        const hadirCount = direkturList.filter(d => (attendance as any)[d].status !== "Tidak Hadir").length;

        // 2. Mapping Data (Samakan nama key dengan tag di DOCX agar tidak undefined)
        const templateData = {
            executionDate: format(executionDate, "eeee, dd MMMM yyyy", { locale: id }),
            startTime: firstAgenda.startTime || "09.00",
            endTime: firstAgenda.endTime || "Selesai",
            meetingLocation: firstAgenda.meetingLocation || "Kantor Pusat",

            // Header Agenda
            agenda_summary_list: dataAgendas.map((a, idx) => {
                const roman = toRoman(idx + 1).toLowerCase();
                // Menggunakan \n agar docxtemplater membuat baris baru di Word
                return `${roman}. ${a.title} (Pemrakarsa: ${a.director || "Direktur Terkait"})`;
            }).join("\n"),

            // Kehadiran
            hadir_count_num: hadirCount,
            hadir_count_terbilang: terbilang(hadirCount),
            pimpinanRapat: Array.isArray(firstAgenda.pimpinanRapat)
                ? (firstAgenda.pimpinanRapat as any[]).map(p => p.label).join(", ")
                : "Direktur Utama",

            catatan_ketidakhadiran: direkturList
                .filter(d => (attendance as any)[d].status === "Tidak Hadir")
                .map(d => `${d} tidak hadir karena ${(attendance as any)[d].reason || "tugas kedinasan"}`)
                .join(". ") || "Seluruh Direksi hadir lengkap",

            guestParticipants: ((firstAgenda.guestParticipants as any[]) || [])
                .map(g => `${g.name} (${g.position})`).join(", ") || "Manajemen terkait",

            // Looping Agenda (Bagian Pembahasan)
            agendas: dataAgendas.map((a, index) => ({
                index: index + 1,
                title: a.title,
                director: a.director || "Direktur Terkait",
                executiveSummary: cleanHtml(a.executiveSummary || ""),
                // Arahan Direksi sebagai list teks tunggal agar mudah diatur di Word
                arahanDireksi: Array.isArray(a.arahanDireksi)
                    ? a.arahanDireksi.map((d, i) => `${String.fromCharCode(97 + i)}. ${d.text}`).join("\n")
                    : "-"
            }))
        };

        doc.render(templateData);
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });

        return {
            success: true,
            data: buf.toString("base64"),
            filename: `Notulensi_Rakordir_${safeNumber}.docx`
        };

    } catch (error: any) {
        console.error("[EXPORT-RAKORDIR-ERROR]:", error.message);
        return { success: false, error: error.message };
    }
}