
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
    [directorName: string]: AttendanceInfo
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
 * HELPER: Membersihkan HTML agar rapi di Word
 */
function cleanHtml(html: string | null | undefined): string {
    if (!html) return "-"
    return html
        .replace(/<\/p>/g, "\n")
        .replace(/<li>/g, "• ")
        .replace(/<\/li>/g, "\n")
        .replace(/<br\s*\/?>/g, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim()
}

/**
 * Export Risalah RADIR – sudah disinkronkan dengan template terbaru
 */
export async function exportRisalahToDocx(meetingNumber: string, meetingYear: string) {
    const safeNumber = meetingNumber || "000"
    const safeYear = meetingYear || new Date().getFullYear().toString()

    try {
        const dataAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, safeNumber),
                eq(agendas.meetingYear, safeYear)
            ),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)],
        })

        if (dataAgendas.length === 0) {
            return { success: false, error: `Data tidak ditemukan untuk No: ${safeNumber} / ${safeYear}.` }
        }

        const firstAgenda = dataAgendas[0]
        const executionDate = firstAgenda.executionDate ? new Date(firstAgenda.executionDate) : new Date()

        const attendance = (firstAgenda.attendanceData as AttendanceData | null) ?? {}

        const direkturList = Object.keys(attendance)
        const hadirCountNum = direkturList.filter(
            (d) => attendance[d]?.status === "Hadir" || attendance[d]?.status === "Kuasa"
        ).length

        const teksCatatan = direkturList
            .filter((d) => attendance[d]?.status === "Tidak Hadir" || attendance[d]?.status === "Kuasa")
            .map((d) => {
                const info = attendance[d]
                if (info?.status === "Kuasa") {
                    const penerima = info.proxy?.[0]?.label ?? "Direktur terkait"
                    return `• ${d} tidak hadir dan memberikan kuasa kepada ${penerima}`
                }
                return `• ${d} tidak hadir (Keterangan: ${info?.reason ?? "-"})`
            })
            .join("\n")

        const templateData = {
            // Header & Pembukaan
            executionDate: format(executionDate, "eeee, dd MMMM yyyy", { locale: id }),
            startTime: firstAgenda.startTime || "",
            endTime: firstAgenda.endTime || "",
            meetingLocation: firstAgenda.meetingLocation || "",

            // Daftar Agenda (Header)
            agenda_summary_list: dataAgendas
                .map((a, i) =>
                    `${toRoman(i + 1).toLowerCase()}. ${a.title} (Pemrakarsa: ${[a.director, a.initiator]
                        .filter((v): v is string => !!v && v.trim() !== "")
                        .join(", ") || "Direktur Terkait"})`
                )
                .join("\n"),

            // Statistik Kehadiran
            hadir_count_num: hadirCountNum,
            hadir_count_terbilang: terbilang(hadirCountNum),
            pimpinanRapat: Array.isArray(firstAgenda.pimpinanRapat)
                ? firstAgenda.pimpinanRapat.map((p: { label: string }) => p.label).join(", ")
                : "Direktur Utama",
            catatan_ketidakhadiran: teksCatatan || "Seluruh Direksi hadir lengkap",
            guestParticipants:
                ((firstAgenda.guestParticipants as Array<{ name: string; position: string }> | null) ?? [])
                    .map((g) => `${g.name} (${g.position})`)
                    .join(", ") || "-",

            // Looping Detail Agenda
            agendas: dataAgendas.map((a, index) => ({
                index: index + 1,
                title: a.title,
                pemrakarsa: [a.director, a.initiator]
                    .filter((v): v is string => !!v && v.trim() !== "")
                    .join(", ") || "Direktur Terkait",
                executiveSummary: cleanHtml(a.executiveSummary || "-"),
                considerations: cleanHtml(a.considerations || "-"),
                meetingDecisions: Array.isArray(a.meetingDecisions)
                    ? a.meetingDecisions
                        .map((d: { text: string }, i: number) => `${i + 1}. ${d.text}`)
                        .join("\n")
                    : cleanHtml(String(a.meetingDecisions || "-")),
                dissentingOpinion: a.dissentingOpinion || "Tidak ada",
            })),
        }

        const templatePath = path.resolve(process.cwd(), "public", "1.2 Radir_Lembar Isi.docx")
        if (!fs.existsSync(templatePath)) throw new Error("Template RADIR tidak ditemukan")

        const content = fs.readFileSync(templatePath, "binary")
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

        doc.render(templateData)
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" })

        return {
            success: true,
            filename: `Risalah_RADIR_No_${safeNumber}_${safeYear}.docx`,
            data: buf.toString("base64"),
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui"
        console.error("[EXPORT-RISALAH-ERROR]:", msg)
        return { success: false, error: msg }
    }
}

/**
 * Export Notulensi RAKORDIR – tetap sama seperti versi terakhir
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