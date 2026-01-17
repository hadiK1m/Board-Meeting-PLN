/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, asc } from "drizzle-orm"
import fs from "fs"
import path from "path"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"

// --- KAMUS DATA: PEMETAAN JABATAN KE NAMA ---
const DIRECTOR_NAMES: Record<string, string> = {
    "DIREKTUR UTAMA (DIRUT)": "DARMAWAN PRASODJO",
    "DIREKTUR KEUANGAN (DIR KEU)": "SINTHYA ROESLY",
    "DIREKTUR LEGAL DAN MANAJEMEN HUMAN CAPITAL (DIR LHC)": "YUSUF DIDI SETIARTO",
    "DIREKTUR MANAJEMEN RISIKO (DIR MRO)": "ADI LUMAKSO",
    "DIREKTUR PERENCANAAN KORPORAT DAN PENGEMBANGAN BISNIS (DIR RENBANG)": "HARTANTO WIBOWO",
    "DIREKTUR MANAJEMEN PROYEK DAN ENERGI BARU TERBARUKAN (DIR MPRO)": "WILUYO KUSDWIHARTO",
    "DIREKTUR TEKNOLOGI, ENGINEERING, DAN KEBERLANJUTAN (DIR TNK)": "MOHAMAD IKHAN ASSEGAF",
    "DIREKTUR MANAJEMEN PEMBANGKITAN (DIR MKIT)": "ADI PRIYANTO",
    "DIREKTUR TRANSMISI DAN PERENCANAAN SISTEM (DIR TRANS)": "EVY HARYADI",
    "DIREKTUR DISTRIBUSI (DIR DIST)": "ADI PRIYANTO",
    "DIREKTUR RETAIL DAN NIAGA (DIR RETAIL)": "EDWIN NUGRAHA PUTRA"
}

// --- HELPER: Angka Terbilang ---
function terbilang(angka: number): string {
    const dasar = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    if (angka < 12) return dasar[angka];
    if (angka < 20) return terbilang(angka - 10) + " belas";
    if (angka < 100) return terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
    return String(angka);
}

function toRoman(num: number): string {
    const lookup: Record<string, number> = { x: 10, ix: 9, v: 5, iv: 4, i: 1 }
    let roman = ""
    for (const key in lookup) {
        while (num >= lookup[key]) {
            roman += key
            num -= lookup[key]
        }
    }
    return roman
}

// --- HELPER: Format Tanggal Indonesia ---
function formatTanggalIndo(dateString: string | null): string {
    if (!dateString) return ".................";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function cleanHtml(html: string | null | undefined): string {
    if (!html) return "-"
    let text = html
    text = text.replace(/<\/p>/gi, "\n")
    text = text.replace(/<br\s*\/?>/gi, "\n")
    text = text.replace(/<li>/gi, "\n- ")
    text = text.replace(/<\/li>/gi, "")
    text = text.replace(/<\/(ul|ol)>/gi, "\n")
    text = text.replace(/<[^>]+>/g, "")
    text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    return text.trim()
}

/**
 * PARSER KHUSUS: Agar Docxtemplater bisa membaca object nested
 */
const expressionParser = (tag: string) => {
    return {
        get: (scope: any) => {
            if (tag === '.') return scope;
            return tag.split('.').reduce((obj, key) => {
                return (obj && obj[key] !== undefined) ? obj[key] : undefined;
            }, scope);
        }
    };
};

// --- HELPER: AUTH GUARD ---
async function assertAuthenticated() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error("Unauthorized: Anda harus login untuk mengunduh dokumen.")
    }
    return user
}

// --- MAIN EXPORT FUNCTIONS ---

/**
 * 1. EXPORT RISALAH RADIR
 */
export async function exportRisalahToDocx(
    meetingNumber: string,
    meetingYear: string,
    templateType: "ISI" | "TTD" = "ISI"
) {
    try {
        await assertAuthenticated()

        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, meetingNumber),
                eq(agendas.meetingYear, meetingYear),
                eq(agendas.meetingType, "RADIR")
            ),
            orderBy: [asc(agendas.createdAt)],
        })

        if (!dataAgendas || dataAgendas.length === 0) {
            throw new Error("Data rapat tidak ditemukan.")
        }

        const first = dataAgendas[0]
        const executionDate = first.executionDate ? new Date(first.executionDate) : new Date()

        let attendanceMap: Record<string, any> = {}
        try {
            attendanceMap = typeof first.attendanceData === "string" ? JSON.parse(first.attendanceData) : (first.attendanceData || {})
        } catch { attendanceMap = {} }

        const direkturList = Object.keys(attendanceMap)
        const hadirCount = direkturList.filter((d) => attendanceMap[d]?.status !== "Tidak Hadir").length

        const teksCatatan = direkturList
            .filter((name) => attendanceMap[name]?.status === "Tidak Hadir" || attendanceMap[name]?.status === "Kuasa")
            .map((name) => {
                const info = attendanceMap[name]
                if (info?.status === "Kuasa") {
                    const penerima = info.proxy?.[0]?.label ?? "Direktur terkait"
                    return `${name} tidak hadir dan memberikan kuasa kepada ${penerima};`
                }
                return `${name} tidak hadir karena ${info?.reason ?? "tugas kedinasan lainnya"};`
            })
            .join("\n")

        const agendaSummaryList = dataAgendas.map((a, idx) => {
            const roman = toRoman(idx + 1).toLowerCase()
            const pemrakarsaList = [a.director, a.initiator].filter((val) => val && val.trim() !== "").join(", ")
            return `${roman}. ${a.title} Pemrakarsa (${pemrakarsaList})`
        }).join("\n")

        const getSigner = (dbKey: string, defaultTitle: string) => {
            const record = attendanceMap[dbKey]
            const realName = DIRECTOR_NAMES[dbKey] || "NAMA TIDAK DITEMUKAN"
            if (record?.status === "Kuasa" && Array.isArray(record.proxy) && record.proxy.length > 0) {
                const proxyKey = record.proxy[0].value
                const proxyName = DIRECTOR_NAMES[proxyKey]
                return { name: proxyName || proxyKey, title: "(ALIH KUASA)" }
            }
            return { name: realName, title: defaultTitle }
        }

        const templateData = {
            meetingNumber,
            meetingYear,
            executionDate: format(executionDate, "eeee, dd MMMM yyyy", { locale: id }),
            day: format(executionDate, "eeee", { locale: id }),
            startTime: first.startTime || "",
            endTime: first.endTime || "",
            location: first.meetingLocation || "",
            agenda_summary_list: agendaSummaryList,
            hadir_count_num: hadirCount,
            hadir_count_terbilang: terbilang(hadirCount),
            pimpinanRapat: Array.isArray(first.pimpinanRapat) ? first.pimpinanRapat.map((p: any) => p.label).join(", ") : "Sekretaris Perusahaan",
            catatan_ketidakhadiran: teksCatatan || "Seluruh Direksi hadir lengkap",
            guestParticipants: Array.isArray(first.guestParticipants) ? first.guestParticipants.map((g: any) => `${g.name} (${g.position})`).join(", ") : "-",
            dir_ut: getSigner("DIREKTUR UTAMA (DIRUT)", "DIRUT"),
            dir_keu: getSigner("DIREKTUR KEUANGAN (DIR KEU)", "DIR KEU"),
            dir_lhc: getSigner("DIREKTUR LEGAL DAN MANAJEMEN HUMAN CAPITAL (DIR LHC)", "DIR LHC"),
            dir_mro: getSigner("DIREKTUR MANAJEMEN RISIKO (DIR MRO)", "DIR MRO"),
            dir_renbang: getSigner("DIREKTUR PERENCANAAN KORPORAT DAN PENGEMBANGAN BISNIS (DIR RENBANG)", "DIR RENBANG"),
            dir_mpro: getSigner("DIREKTUR MANAJEMEN PROYEK DAN ENERGI BARU TERBARUKAN (DIR MPRO)", "DIR MPRO"),
            dir_tnk: getSigner("DIREKTUR TEKNOLOGI, ENGINEERING, DAN KEBERLANJUTAN (DIR TNK)", "DIR TNK"),
            dir_mkit: getSigner("DIREKTUR MANAJEMEN PEMBANGKITAN (DIR MKIT)", "DIR MKIT"),
            dir_trans: getSigner("DIREKTUR TRANSMISI DAN PERENCANAAN SISTEM (DIR TRANS)", "DIR TRANS"),
            dir_dist: getSigner("DIREKTUR DISTRIBUSI (DIR DIST)", "DIR DIST"),
            dir_retail: getSigner("DIREKTUR RETAIL DAN NIAGA (DIR RETAIL)", "DIR RETAIL"),
            agendas: dataAgendas.map((a, i) => ({
                index: i + 1,
                title: a.title,
                pemrakarsa: [a.director, a.initiator].filter(Boolean).join(", ") || "-",
                executiveSummary: cleanHtml(a.executiveSummary || ""),
                considerations: Array.isArray(a.considerations) ? a.considerations.map((c: any, idx: number) => `${idx + 1}. ${c.text}`).join("\n") : cleanHtml(String(a.considerations || "")),
                meetingDecisions: Array.isArray(a.meetingDecisions) ? a.meetingDecisions.map((d: any, idx: number) => `${idx + 1}. ${d.text}`).join("\n") : cleanHtml(String(a.meetingDecisions || "")),
                dissentingOpinion: a.dissentingOpinion || "Tidak ada",
            })),
        }

        const fileName = templateType === "ISI" ? "1.2 Radir_Lembar Isi.docx" : "1.3. Radir_Lembar ttd.docx"
        const templatePath = path.resolve(process.cwd(), "public", fileName)
        if (!fs.existsSync(templatePath)) throw new Error(`Template ${fileName} tidak ditemukan.`)

        const content = fs.readFileSync(templatePath, "binary")
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, parser: expressionParser, nullGetter: () => "" })
        doc.render(templateData)
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" })

        return { success: true, data: buf.toString("base64"), filename: `${templateType}_RADIR_${meetingNumber}_${meetingYear}.docx` }
    } catch (error: any) { return { success: false, error: error.message } }
}

/**
 * 2. EXPORT NOTULENSI RAKORDIR (NAMA DISESUAIKAN DENGAN UI)
 */
export async function exportRakordirToDocx(meetingNumber: string, meetingYear: string) {
    try {
        if (!meetingNumber || !meetingYear) {
            throw new Error("Nomor dan Tahun rapat diperlukan.");
        }

        const sessionAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, meetingNumber),
                eq(agendas.meetingYear, meetingYear),
                eq(agendas.meetingType, "RAKORDIR")
            )
        });

        if (sessionAgendas.length === 0) {
            throw new Error("Data rapat tidak ditemukan.");
        }

        const masterData = sessionAgendas[0];

        // --- PARSING DATA ---

        // A. Pimpinan Rapat
        let pimpinanText = "DIREKTUR UTAMA";
        try {
            const pimpinanArr = Array.isArray(masterData.pimpinanRapat)
                ? masterData.pimpinanRapat
                : JSON.parse(String(masterData.pimpinanRapat || "[]"));

            if (pimpinanArr.length > 0) {
                pimpinanText = pimpinanArr.map((p: any) => p.label).join(", ").toUpperCase();
            }
        } catch { /* Ignore error */ }

        // B. Kehadiran Direksi
        let attendanceData: Record<string, any> = {};
        try {
            attendanceData = typeof masterData.attendanceData === 'object'
                ? masterData.attendanceData as Record<string, any>
                : JSON.parse(String(masterData.attendanceData || "{}"));
        } catch { /* Ignore */ }

        const hadirCount = Object.values(attendanceData).filter((d: any) => d.status === "Hadir").length;

        // C. Catatan Ketidakhadiran
        const absenList = Object.entries(attendanceData)
            // ✅ PERBAIKAN: Menggunakan `[, val]` untuk mengabaikan parameter pertama (nama/key)
            .filter(([, val]: [string, any]) => val.status !== "Hadir")
            .map(([name, val]: [string, any]) => {
                const reason = val.reason ? ` (${val.reason})` : "";
                return `- ${name}${reason}`;
            });

        const catatanKetidakhadiran = absenList.length > 0
            ? "Direksi yang berhalangan hadir:\n" + absenList.join("\n")
            : "Seluruh Direksi Hadir.";

        // D. Tamu Undangan
        const allGuests = new Set<string>();
        sessionAgendas.forEach(agenda => {
            try {
                const guests = Array.isArray(agenda.guestParticipants)
                    ? agenda.guestParticipants
                    : JSON.parse(String(agenda.guestParticipants || "[]"));

                guests.forEach((g: any) => {
                    if (g.name) allGuests.add(`${g.name} (${g.position || "Tamu"})`);
                });
            } catch { /* Ignore */ }
        });
        const guestText = allGuests.size > 0
            ? Array.from(allGuests).join(", ")
            : "Tidak ada peserta tambahan";

        // E. Daftar Agenda
        const agendaSummaryList = sessionAgendas.map((agenda, index) => {
            return `${index + 1}. ${agenda.title}`;
        }).join("\n");

        // F. Data Detail Per Agenda
        const agendaDetails = sessionAgendas.map((agenda, index) => {
            let arahanList = [];
            try {
                const rawArahan = Array.isArray(agenda.arahanDireksi)
                    ? agenda.arahanDireksi
                    : JSON.parse(String(agenda.arahanDireksi || "[]"));

                arahanList = rawArahan.map((a: any, idx: number) => ({
                    no: idx + 1,
                    text: a.text || "-"
                }));
            } catch { arahanList = [] }

            return {
                no: index + 1,
                judul_agenda: agenda.title || "Tanpa Judul",
                pemrakarsa: agenda.initiator || "-",
                executive_summary: (agenda.executiveSummary || "-").replace(/<[^>]*>?/gm, ''),
                arahan_list: arahanList.length > 0 ? arahanList : [{ no: "-", text: "Tidak ada arahan khusus." }]
            };
        });

        // 4. Siapkan Data untuk Template
        const data = {
            meetingNumber: meetingNumber,
            meetingYear: meetingYear,
            hari_tanggal: formatTanggalIndo(masterData.executionDate),
            startTime: masterData.startTime ? masterData.startTime.substring(0, 5) : "09:00",
            endTime: masterData.endTime ? masterData.endTime.substring(0, 5) : "Selesai",
            meetingLocation: masterData.meetingLocation || "Tempat belum ditentukan",
            agenda_summary_list: agendaSummaryList,
            hadir_count_num: hadirCount,
            hadir_count_terbilang: terbilang(hadirCount),
            pimpinanRapat: pimpinanText,
            catatan_ketidakhadiran: catatanKetidakhadiran,
            guestParticipants: guestText,
            agendas: agendaDetails,
        };

        const templatePath = path.resolve("./public/2. Template Notulensi Rakordir.docx");
        const content = fs.readFileSync(templatePath, "binary");

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.render(data);

        const buf = doc.getZip().generate({ type: "nodebuffer" });
        return {
            success: true,
            data: buf.toString("base64"),
            filename: `Notulensi_Rakordir_${meetingNumber}_${meetingYear}.docx`
        };

    } catch (error: any) {
        console.error("[EXPORT_ERROR]", error);
        return { success: false, error: error.message || "Gagal melakukan export dokumen." };
    }
}