
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

interface AttendanceInfo {
    status: "Hadir" | "Tidak Hadir" | "Kuasa"
    reason?: string
    proxy?: Array<{ value: string; label: string }>
}

interface AttendanceData {
    [directorKey: string]: AttendanceInfo
}

/**
 * HELPER: Mengonversi angka menjadi kata terbilang Indonesia
 */
function terbilang(n: number): string {
    if (n === 0) return "nol"
    const ambil = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
    if (n < 12) return ambil[n]
    if (n < 20) return terbilang(n - 10) + " belas"
    if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh " + (n % 10 !== 0 ? terbilang(n % 10) : "")
    return String(n)
}

/**
 * HELPER: Mengonversi angka menjadi huruf Romawi kecil
 */
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

/**
 * HELPER: Membersihkan tag HTML dari editor Tiptap untuk Docx
 */
function cleanHtml(html: string | null | undefined): string {
    if (!html) return "-"
    return html
        .replace(/<\/p><p>/g, "\n")
        .replace(/<br\s*\/?>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim()
}

/**
 * EXPORT RISALAH RADIR (Lembar Isi 1.2 & Lembar TTD 1.3)
 */
export async function exportRisalahToDocx(
    meetingNumber: string,
    meetingYear: string,
    templateType: "ISI" | "TTD" = "ISI" // default ke Lembar Isi
) {
    try {
        // 1. Ambil semua agenda dalam satu sesi rapat
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

        // 2. Parsing Data Kehadiran secara Aman
        let attendanceMap: Record<string, any> = {}
        try {
            attendanceMap =
                typeof first.attendanceData === "string"
                    ? JSON.parse(first.attendanceData)
                    : (first.attendanceData || {})
        } catch (e) {
            console.error("Gagal parse attendance:", e)
            attendanceMap = {}
        }

        // 3. Helper untuk mencocokkan data Signer dengan Key Database
        const getSigner = (dbKey: string, realName: string, title: string) => {
            const record = attendanceMap[dbKey]
            return {
                name: realName,
                title: title,
                // Jika status "Kuasa", maka munculkan label, jika tidak kosongkan
                proxyLabel: record?.status === "Kuasa" ? "(Alih Kuasa)" : "",
            }
        }

        // 4. Susun Template Data
        const templateData = {
            meetingNumber,
            meetingYear,
            executionDate: format(executionDate, "eeee, dd MMMM yyyy", { locale: id }),
            startTime: first.startTime || "",
            endTime: first.endTime || "",
            location: first.meetingLocation || "",

            // PEMETAAN 11 DIREKTUR UNTUK LEMBAR TTD (1.3) – hanya aktif jika TTD
            ...(templateType === "TTD" && {
                dir_ut: getSigner("DIREKTUR UTAMA (DIRUT)", "DARMAWAN PRASODJO", "DIRUT"),

                dir_keu: getSigner("DIREKTUR KEUANGAN (DIR KEU)", "SINTHYA ROESLY", "DIR KEU"),
                dir_lhc: getSigner("DIREKTUR LEGAL DAN MANAJEMEN HUMAN CAPITAL (DIR LHC)", "YUSUF DIDI SETIARTO", "DIR LHC"),
                dir_mro: getSigner("DIREKTUR MANAJEMEN RISIKO (DIR MRO)", "ADI LUMAKSO", "DIR MRO"),

                dir_renbang: getSigner("DIREKTUR PERENCANAAN KORPORAT DAN PENGEMBANGAN BISNIS (DIR RENBANG)", "HARTANTO WIBOWO", "DIR RENBANG"),
                dir_mpro: getSigner("DIREKTUR MANAJEMEN PROYEK DAN ENERGI BARU TERBARUKAN (DIR MPRO)", "SUROSO ISNANDAR", "DIR MPRO"),
                dir_tnk: getSigner("DIREKTUR TEKNOLOGI, ENGINEERING, DAN KEBERLANJUTAN (DIR TNK)", "E. HARYADI", "DIR TNK"),

                dir_mkit: getSigner("DIREKTUR MANAJEMEN PEMBANGKITAN (DIR MKIT)", "RIZAL CALVARY MARIMBO", "DIR MKIT"),
                dir_trans: getSigner("DIREKTUR TRANSMISI DAN PERENCANAAN SISTEM (DIR TRANS)", "EDWIN NUGRAHA PUTRA", "DIR TRANS"),

                dir_dist: getSigner("DIREKTUR DISTRIBUSI (DIR DIST)", "ARSYADANY GHANA AKMALAPUTRI", "DIR DIST"),
                dir_retail: getSigner("DIREKTUR RETAIL DAN NIAGA (DIR RETAIL)", "ADI PRIYANTO", "DIR RETAIL"),
            }),

            // DATA UNTUK LEMBAR ISI (1.2) – looping agenda
            agendas: dataAgendas.map((a, i) => ({
                index: i + 1,
                title: a.title,
                pemrakarsa: [a.director, a.initiator].filter(Boolean).join(", ") || "-",
                executiveSummary: cleanHtml(a.executiveSummary || ""),
                considerations: Array.isArray(a.considerations)
                    ? a.considerations.map((c: any, idx: number) => `${idx + 1}. ${c.text}`).join("\n")
                    : cleanHtml(String(a.considerations || "")),
                meetingDecisions: Array.isArray(a.meetingDecisions)
                    ? a.meetingDecisions.map((d: any, idx: number) => `${idx + 1}. ${d.text}`).join("\n")
                    : cleanHtml(String(a.meetingDecisions || "")),
                dissentingOpinion: a.dissentingOpinion || "Tidak ada",
            })),
        }

        // 5. Pilih File Template
        const fileName =
            templateType === "ISI" ? "1.2 Radir_Lembar Isi.docx" : "1.3. Radir_Lembar ttd.docx"

        const templatePath = path.resolve(process.cwd(), "public", fileName)

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template ${fileName} tidak ditemukan di folder public.`)
        }

        // 6. Proses Docxtemplater
        const content = fs.readFileSync(templatePath, "binary")
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
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
 * Export Notulensi RAKORDIR – tetap sama seperti versi sebelumnya
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