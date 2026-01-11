/* eslint-disable @typescript-eslint/no-explicit-any */
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

// --- TIPE DATA ---
interface AttendanceInfo {
    status: "Hadir" | "Tidak Hadir" | "Kuasa"
    reason?: string
    proxy?: Array<{ value: string; label: string }>
}

interface AttendanceData {
    [directorKey: string]: AttendanceInfo
}

// --- KAMUS DATA: PEMETAAN JABATAN KE NAMA ---
const DIRECTOR_NAMES: Record<string, string> = {
    "DIREKTUR UTAMA (DIRUT)": "DARMAWAN PRASODJO",
    "DIREKTUR KEUANGAN (DIR KEU)": "SINTHYA ROESLY",
    "DIREKTUR LEGAL DAN MANAJEMEN HUMAN CAPITAL (DIR LHC)": "YUSUF DIDI SETIARTO",
    "DIREKTUR MANAJEMEN RISIKO (DIR MRO)": "ADI LUMAKSO",
    "DIREKTUR PERENCANAAN KORPORAT DAN PENGEMBANGAN BISNIS (DIR RENBANG)": "HARTANTO WIBOWO",
    "DIREKTUR MANAJEMEN PROYEK DAN ENERGI BARU TERBARUKAN (DIR MPRO)": "SUROSO ISNANDAR",
    "DIREKTUR TEKNOLOGI, ENGINEERING, DAN KEBERLANJUTAN (DIR TNK)": "E. HARYADI",
    "DIREKTUR MANAJEMEN PEMBANGKITAN (DIR MKIT)": "RIZAL CALVARY MARIMBO",
    "DIREKTUR TRANSMISI DAN PERENCANAAN SISTEM (DIR TRANS)": "EDWIN NUGRAHA PUTRA",
    "DIREKTUR DISTRIBUSI (DIR DIST)": "ARSYADANY GHANA AKMALAPUTRI",
    "DIREKTUR RETAIL DAN NIAGA (DIR RETAIL)": "ADI PRIYANTO"
}

// --- HELPER FUNCTIONS ---

function terbilang(n: number): string {
    if (n === 0) return "nol"
    const ambil = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
    if (n < 12) return ambil[n]
    if (n < 20) return terbilang(n - 10) + " belas"
    if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh " + (n % 10 !== 0 ? terbilang(n % 10) : "")
    return String(n)
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
 * PARSER KHUSUS: Agar Docxtemplater bisa membaca object nested (titik)
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

// --- EXPORT FUNCTION ---

export async function exportRisalahToDocx(
    meetingNumber: string,
    meetingYear: string,
    templateType: "ISI" | "TTD" = "ISI"
) {
    try {
        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, meetingNumber),
                eq(agendas.meetingYear, meetingYear),
                eq(agendas.meetingType, "RADIR")
            ),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)],
        })

        if (!dataAgendas || dataAgendas.length === 0) {
            throw new Error("Data rapat tidak ditemukan.")
        }

        const first = dataAgendas[0]
        const executionDate = first.executionDate ? new Date(first.executionDate) : new Date()

        // 1. Parsing Attendance Data
        let attendanceMap: Record<string, any> = {}
        try {
            attendanceMap = typeof first.attendanceData === "string" ? JSON.parse(first.attendanceData) : (first.attendanceData || {})
        } catch (e) {
            console.error("Gagal parse attendance:", e)
            attendanceMap = {}
        }

        // 2. Hitung Statistik Kehadiran
        const direkturList = Object.keys(attendanceMap)
        const hadirCount = direkturList.filter(
            (d) => attendanceMap[d]?.status !== "Tidak Hadir"
        ).length

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

        // 3. Format Daftar Ringkasan Agenda (Agenda Summary List)
        const agendaSummaryList = dataAgendas.map((a, idx) => {
            const roman = toRoman(idx + 1).toLowerCase()
            const pemrakarsaList = [a.director, a.initiator]
                .filter((val) => val && val.trim() !== "")
                .join(", ")
            return `${roman}. ${a.title} Pemrakarsa (${pemrakarsaList})`
        }).join("\n")

        // 4. Helper Logic Alih Kuasa
        const getSigner = (dbKey: string, defaultTitle: string) => {
            const record = attendanceMap[dbKey]
            const realName = DIRECTOR_NAMES[dbKey] || "NAMA TIDAK DITEMUKAN"

            if (record?.status === "Kuasa" && Array.isArray(record.proxy) && record.proxy.length > 0) {
                const proxyKey = record.proxy[0].value
                const proxyName = DIRECTOR_NAMES[proxyKey]
                return {
                    name: proxyName || proxyKey,
                    title: "(ALIH KUASA)",
                }
            }
            return {
                name: realName,
                title: defaultTitle
            }
        }

        // 5. Susun Data Template Lengkap
        const templateData = {
            meetingNumber,
            meetingYear,
            executionDate: format(executionDate, "eeee, dd MMMM yyyy", { locale: id }),
            day: format(executionDate, "eeee", { locale: id }),
            startTime: first.startTime || "",
            endTime: first.endTime || "",
            location: first.meetingLocation || "",

            // --- DATA PEMBUKAAN ---
            agenda_summary_list: agendaSummaryList,
            hadir_count_num: hadirCount,
            hadir_count_terbilang: terbilang(hadirCount),
            pimpinanRapat: Array.isArray(first.pimpinanRapat)
                ? first.pimpinanRapat.map((p: any) => p.label).join(", ")
                : "Sekretaris Perusahaan",
            catatan_ketidakhadiran: teksCatatan || "Seluruh Direksi hadir lengkap",
            guestParticipants: Array.isArray(first.guestParticipants)
                ? first.guestParticipants.map((g: any) => `${g.name} (${g.position})`).join(", ")
                : "-",

            // --- DATA PENANDATANGAN ---
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

            // --- DATA AGENDA (LOOP) ---
            agendas: dataAgendas.map((a, i) => ({
                index: i + 1,
                title: a.title,
                pemrakarsa: [a.director, a.initiator].filter(Boolean).join(", ") || "-",
                executiveSummary: cleanHtml(a.executiveSummary || ""),

                // ✅ PERBAIKAN DI SINI: Dasar Pertimbangan (Cek Array vs String)
                considerations: Array.isArray(a.considerations)
                    ? a.considerations.map((c: any, idx: number) => `${idx + 1}. ${c.text}`).join("\n")
                    : cleanHtml(String(a.considerations || "")),

                // ✅ PERBAIKAN DI SINI: Keputusan Rapat (Cek Array vs String)
                meetingDecisions: Array.isArray(a.meetingDecisions)
                    ? a.meetingDecisions.map((d: any, idx: number) => `${idx + 1}. ${d.text}`).join("\n")
                    : cleanHtml(String(a.meetingDecisions || "")),

                dissentingOpinion: a.dissentingOpinion || "Tidak ada",
            })),
        }

        const fileName = templateType === "ISI" ? "1.2 Radir_Lembar Isi.docx" : "1.3. Radir_Lembar ttd.docx"
        const templatePath = path.resolve(process.cwd(), "public", fileName)

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template ${fileName} tidak ditemukan di folder public.`)
        }

        const content = fs.readFileSync(templatePath, "binary")
        const zip = new PizZip(content)

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            parser: expressionParser,
            nullGetter: () => { return "" }
        })

        doc.render(templateData)

        const buf = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        })

        return {
            success: true,
            data: buf.toString("base64"),
            filename: `${templateType}_RADIR_${meetingNumber}_${meetingYear}.docx`,
        }
    } catch (error: any) {
        console.error("Export Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * EXPORT NOTULENSI RAKORDIR
 */
export async function exportRakordirToDocx(meetingNumber: string, meetingYear: string) {
    const safeNumber = meetingNumber || "000"
    const safeYear = meetingYear || new Date().getFullYear().toString()

    try {
        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, safeNumber),
                eq(agendas.meetingYear, safeYear),
                eq(agendas.meetingType, "RAKORDIR")
            ),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)],
        })

        if (dataAgendas.length === 0) {
            return { success: false, error: "Data Rakordir tidak ditemukan." }
        }

        const firstAgenda = dataAgendas[0]
        const executionDate = firstAgenda.executionDate ? new Date(firstAgenda.executionDate) : new Date()
        const attendance = (firstAgenda.attendanceData as AttendanceData | null) ?? {}
        const direkturList = Object.keys(attendance)

        const hadirCount = direkturList.filter(
            (d) => attendance[d]?.status !== "Tidak Hadir"
        ).length

        const teksCatatan = direkturList
            .filter((name) => attendance[name]?.status === "Tidak Hadir" || attendance[name]?.status === "Kuasa")
            .map((name) => {
                const info = attendance[name]
                if (info?.status === "Kuasa") {
                    const penerima = info.proxy?.[0]?.label ?? "Direktur terkait"
                    return `${name} tidak hadir dan memberikan kuasa kepada ${penerima};`
                }
                return `${name} tidak hadir karena ${info?.reason ?? "tugas kedinasan lainnya"};`
            })
            .join("\n")

        const templateData = {
            xx: format(executionDate, "eeee, dd MMMM yyyy", { locale: id }),
            startTime: firstAgenda.startTime || "",
            endTime: firstAgenda.endTime || "",
            meetingLocation: firstAgenda.meetingLocation || "",
            meetingYear: safeYear,

            agenda_summary_list: dataAgendas
                .map((a, idx) => {
                    const roman = toRoman(idx + 1).toLowerCase()
                    const fullPemrakarsa = [a.director, a.initiator]
                        .filter((v): v is string => !!v && v.trim() !== "")
                        .join(", ")
                    return `${roman}. ${a.title} (Pemrakarsa: ${fullPemrakarsa || "Direktur Terkait"})`
                })
                .join("\n"),

            hadir_count_num: hadirCount,
            hadir_count_terbilang: terbilang(hadirCount),
            pimpinanRapat:
                Array.isArray(firstAgenda.pimpinanRapat)
                    ? firstAgenda.pimpinanRapat.map((p: { label: string }) => p.label).join(", ")
                    : "Sekretaris Perusahaan",

            catatan_ketidakhadiran: teksCatatan || "Seluruh Direksi hadir lengkap",

            guestParticipants:
                ((firstAgenda.guestParticipants as Array<{ name: string; position: string }> | null) ?? [])
                    .map((g) => `${g.name} (${g.position})`)
                    .join(", ") || "-",

            agendas: dataAgendas.map((a, index) => {
                const fullPemrakarsa = [a.director, a.initiator]
                    .filter((v): v is string => !!v && v.trim() !== "")
                    .join(", ")

                return {
                    index: index + 1,
                    title: a.title,
                    pemrakarsa: fullPemrakarsa || "Direktur Terkait",
                    executiveSummary: cleanHtml(a.executiveSummary),
                    arahanDireksi: Array.isArray(a.arahanDireksi)
                        ? a.arahanDireksi
                            .map((d: { text: string }, i: number) => `${String.fromCharCode(97 + i)}. ${d.text}`)
                            .join("\n")
                        : "-",
                }
            }),
        }

        const templatePath = path.resolve(process.cwd(), "public", "2. Template Notulensi Rakordir.docx")
        if (!fs.existsSync(templatePath)) throw new Error("Template RAKORDIR tidak ditemukan")

        const content = fs.readFileSync(templatePath, "binary")
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

        doc.render(templateData)
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" })

        return {
            success: true,
            data: buf.toString("base64"),
            filename: `Notulensi_Rakordir_${safeNumber}_${safeYear}.docx`,
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui"
        console.error("[EXPORT-RAKORDIR-ERROR]:", msg)
        return { success: false, error: msg }
    }
}