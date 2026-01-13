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
    "DIREKTUR MANAJEMEN PROYEK DAN ENERGI BARU TERBARUKAN (DIR MPRO)": "WILUYO KUSDWIHARTO",
    "DIREKTUR TEKNOLOGI, ENGINEERING, DAN KEBERLANJUTAN (DIR TNK)": "MOHAMAD IKHAN ASSEGAF",
    "DIREKTUR MANAJEMEN PEMBANGKITAN (DIR MKIT)": "ADI PRIYANTO",
    "DIREKTUR TRANSMISI DAN PERENCANAAN SISTEM (DIR TRANS)": "EVY HARYADI",
    "DIREKTUR DISTRIBUSI (DIR DIST)": "ADI PRIYANTO",
    "DIREKTUR RETAIL DAN NIAGA (DIR RETAIL)": "EDWIN NUGRAHA PUTRA"
}

const DIRECTOR_ORDER = [
    "DIREKTUR UTAMA (DIRUT)",
    "DIREKTUR KEUANGAN (DIR KEU)",
    "DIREKTUR LEGAL DAN MANAJEMEN HUMAN CAPITAL (DIR LHC)",
    "DIREKTUR MANAJEMEN RISIKO (DIR MRO)",
    "DIREKTUR PERENCANAAN KORPORAT DAN PENGEMBANGAN BISNIS (DIR RENBANG)",
    "DIREKTUR TRANSMISI DAN PERENCANAAN SISTEM (DIR TRANS)",
    "DIREKTUR MANAJEMEN PEMBANGKITAN (DIR MKIT)",
    "DIREKTUR DISTRIBUSI (DIR DIST)",
    "DIREKTUR RETAIL DAN NIAGA (DIR RETAIL)",
    "DIREKTUR MANAJEMEN PROYEK DAN ENERGI BARU TERBARUKAN (DIR MPRO)",
]

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
        await assertAuthenticated()

        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, meetingNumber),
                eq(agendas.meetingYear, meetingYear),
                eq(agendas.meetingType, "RAKORDIR")
            ),
        })

        if (dataAgendas.length === 0) throw new Error("Data agenda Rakordir tidak ditemukan.")

        const headerData = dataAgendas[0]
        const executionDate = headerData.executionDate ? new Date(headerData.executionDate) : new Date()
        const dayName = format(executionDate, "EEEE", { locale: id })
        const dateFormatted = format(executionDate, "dd MMMM yyyy", { locale: id })

        const attendanceData: AttendanceData = typeof headerData.attendanceData === "string" ? JSON.parse(headerData.attendanceData) : (headerData.attendanceData || {})
        const hadirCount = Object.keys(attendanceData).filter((k) => attendanceData[k]?.status !== "Tidak Hadir").length

        const directorsList = DIRECTOR_ORDER.map(role => {
            const info = attendanceData[role]
            const name = DIRECTOR_NAMES[role] || role
            let statusText = "Hadir"
            if (info?.status === "Tidak Hadir") statusText = info.reason ? `Ijin (${info.reason})` : "Ijin"
            else if (info?.status === "Kuasa") statusText = `Diwakilkan kepada ${info.proxy?.[0]?.label || "N/A"}`
            return { role: role.replace("DIREKTUR", "").replace(/\(.*\)/, "").trim(), name, status: statusText }
        })

        const guestList = Array.isArray(headerData.guestParticipants) ? headerData.guestParticipants.map((g: any, i: number) => ({ index: i + 1, name: g.name, position: g.position })) : []

        const templateData = {
            meetingNumber, meetingYear, dayName, date: dateFormatted,
            startTime: headerData.startTime || "-", endTime: headerData.endTime || "Selesai",
            location: headerData.meetingLocation || "Kantor Pusat PLN",
            hadir_count_num: hadirCount, hadir_count_terbilang: terbilang(hadirCount),
            pimpinanRapat: Array.isArray(headerData.pimpinanRapat) ? headerData.pimpinanRapat.map((p: any) => p.label).join(", ") : "-",
            directors: directorsList, guests: guestList,
            agendas: dataAgendas.map((a, index) => {
                let fullPemrakarsa = ""
                try {
                    const parsedInit = JSON.parse(a.initiator || "[]")
                    fullPemrakarsa = Array.isArray(parsedInit) ? parsedInit.map((p: any) => p.label || p).join(", ") : (a.initiator || "")
                } catch { fullPemrakarsa = a.initiator || "" }

                let arahanText = "-"
                if (Array.isArray(a.arahanDireksi) && a.arahanDireksi.length > 0) {
                    arahanText = a.arahanDireksi.map((d: any, i: number) => `${String.fromCharCode(97 + i)}. ${d.text || d.value}`).join("\n")
                }
                return { index: index + 1, title: a.title, pemrakarsa: fullPemrakarsa || "Direktur Terkait", executiveSummary: cleanHtml(a.executiveSummary), arahanDireksi: arahanText }
            }),
        }

        const templatePath = path.resolve(process.cwd(), "public", "2. Template Notulensi Rakordir.docx")
        if (!fs.existsSync(templatePath)) throw new Error("File template notulensi Rakordir tidak ditemukan.")

        const content = fs.readFileSync(templatePath, "binary")
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, parser: expressionParser })
        doc.render(templateData)
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" })

        return { success: true, data: buf.toString("base64"), filename: `Notulensi_Rakordir_${meetingNumber.replace(/[^a-zA-Z0-9-]/g, "")}_${meetingYear}.docx` }
    } catch (error: any) { return { success: false, error: error.message || "Gagal membuat dokumen notulensi." } }
}