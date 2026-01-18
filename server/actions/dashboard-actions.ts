/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { and, gte, lte, desc } from "drizzle-orm"

interface DashboardFilter {
    from: Date
    to: Date
}

const DIRECTORS_MAP: Record<string, string> = {
    "DIREKTUR UTAMA (DIRUT)": "DIRUT",
    "DIREKTUR KEUANGAN (DIR KEU)": "DIR KEU",
    "DIREKTUR DISTRIBUSI (DIR DIST)": "DIR DIST",
    "DIREKTUR MANAJEMEN RISIKO (DIR MRO)": "DIR MRO",
    "DIREKTUR RETAIL DAN NIAGA (DIR RETAIL)": "DIR RETAIL",
    "DIREKTUR MANAJEMEN PEMBANGKITAN (DIR MKIT)": "DIR MKIT",
    "DIREKTUR LEGAL DAN MANAJEMEN HUMAN CAPITAL (DIR LHC)": "DIR LHC",
    "DIREKTUR TRANSMISI DAN PERENCANAAN SISTEM (DIR TRANS)": "DIR TRANS",
    "DIREKTUR TEKNOLOGI, ENGINEERING, DAN KEBERLANJUTAN (DIR TNK)": "DIR TNK",
    "DIREKTUR MANAJEMEN PROYEK DAN ENERGI BARU TERBARUKAN (DIR MPRO)": "DIR MPRO",
    "DIREKTUR PERENCANAAN KORPORAT DAN PENGEMBANGAN BISNIS (DIR RENBANG)": "DIR RENBANG",
}

export async function getDashboardStats(filter: DashboardFilter) {
    try {
        // ------------------------------------------------------------------
        // 1. SETUP DATE RANGE (Agar mencakup seluruh jam dalam hari tsb)
        // ------------------------------------------------------------------
        const fromDate = new Date(filter.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(filter.to);
        toDate.setHours(23, 59, 59, 999);

        // ------------------------------------------------------------------
        // 2. AMBIL DATA DARI DATABASE
        // ------------------------------------------------------------------
        const data = await db.query.agendas.findMany({
            where: and(
                gte(agendas.updatedAt, fromDate),
                lte(agendas.updatedAt, toDate)
            ),
            orderBy: [desc(agendas.updatedAt)]
        })

        // ------------------------------------------------------------------
        // 3. INISIALISASI VARIABEL STATISTIK
        // ------------------------------------------------------------------
        const stats = {
            rakordir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, selesai: 0, dibatalkan: 0, total: 0 },
            radir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, selesai: 0, dibatalkan: 0, total: 0 },
            followUp: {
                radir: { inProgress: 0, done: 0 },
                rakordir: { inProgress: 0, done: 0 }
            },
            directorStats: {} as Record<string, { present: number, total: number, percentage: number }>,
            // Array untuk Tabel Data
            listData: [] as any[]
        }

        // Init Data Direksi (Agar urutan rapi & nilai awal 0)
        Object.values(DIRECTORS_MAP).forEach(shortName => {
            stats.directorStats[shortName] = { present: 0, total: 0, percentage: 0 }
        })

        // ------------------------------------------------------------------
        // 4. LOOPING PENGOLAHAN DATA
        // ------------------------------------------------------------------
        for (const item of data) {
            const type = item.meetingType === "RAKORDIR" ? "rakordir" : "radir"

            // A. HITUNG STATUS RAPAT
            if (item.meetingStatus === "CANCELLED") {
                stats[type].dibatalkan++
            }
            else if (item.status === "RAPAT_SELESAI" || item.meetingStatus === "COMPLETED") {
                stats[type].selesai++

                // B. HITUNG KEHADIRAN (Hanya jika Rapat Selesai & Tipe RADIR)
                if (item.attendanceData && item.meetingType === "RADIR") {
                    try {
                        const attendance = typeof item.attendanceData === 'string'
                            ? JSON.parse(item.attendanceData)
                            : item.attendanceData

                        Object.keys(DIRECTORS_MAP).forEach(longName => {
                            const record = (attendance as any)[longName]
                            const shortName = DIRECTORS_MAP[longName]

                            // Logika: Hanya hitung jika statusnya Jelas (Hadir/Tidak/Kuasa).
                            // Abaikan jika kosong/belum ditentukan.
                            if (record && record.status) {
                                if (record.status === "Hadir") {
                                    stats.directorStats[shortName].present++
                                    stats.directorStats[shortName].total++
                                }
                                else if (record.status === "Tidak Hadir" || record.status === "Kuasa") {
                                    stats.directorStats[shortName].total++
                                }
                            }
                        })
                    } catch (e) { console.error("Error parsing attendance:", e) }
                }

                // C. HITUNG STATUS MONEV / TINDAK LANJUT (Hanya jika Rapat Selesai)
                if (item.meetingDecisions) {
                    try {
                        const decisions = Array.isArray(item.meetingDecisions)
                            ? item.meetingDecisions
                            : JSON.parse(item.meetingDecisions as string)

                        decisions.forEach((d: any) => {
                            if (d.status === "DONE") stats.followUp[type].done++
                            else stats.followUp[type].inProgress++
                        })
                    } catch (e) { console.error("Error parse decisions:", e) }
                }
            }
            else if (item.status === "DIJADWALKAN" || item.meetingStatus === "SCHEDULED") {
                stats[type].dijadwalkan++
            }
            else if (item.status === "DAPAT_DILANJUTKAN") {
                stats[type].dapatDilanjutkan++
            }
            else if (item.status === "DRAFT") {
                stats[type].draft++
            }

            // Tambah Total Counter
            stats[type].total++
        }

        // ------------------------------------------------------------------
        // 5. FORMAT DATA UNTUK CHART
        // ------------------------------------------------------------------
        const directorChartData = Object.entries(stats.directorStats).map(([name, val]) => {
            const percentage = val.total > 0 ? Math.round((val.present / val.total) * 100) : 0
            return {
                name,
                percentage,
                present: val.present,
                total: val.total,
                fill: percentage >= 80 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444"
            }
        })

        // ------------------------------------------------------------------
        // 6. FORMAT DATA UNTUK LIST TABEL
        // ------------------------------------------------------------------
        const listData = data.map(item => {
            // Hitung Status Monev per Agenda untuk ditampilkan di tabel
            let monevSummary = "N/A"
            if (item.meetingDecisions) {
                try {
                    const decisions = typeof item.meetingDecisions === 'string'
                        ? JSON.parse(item.meetingDecisions)
                        : item.meetingDecisions

                    if (Array.isArray(decisions) && decisions.length > 0) {
                        const doneCount = decisions.filter((d: any) => d.status === "DONE").length
                        const totalCount = decisions.length

                        if (doneCount === totalCount) monevSummary = "Selesai"
                        else monevSummary = "On Progress"
                    } else {
                        monevSummary = "Tidak Ada Arahan"
                    }
                } catch { monevSummary = "Error Data" }
            } else {
                // Jika draft/jadwal biasanya belum ada keputusan
                if (item.status === "DRAFT" || item.status === "DIJADWALKAN") monevSummary = "-"
                else monevSummary = "Tidak Ada Arahan"
            }

            // ✅ PASTIKAN BAGIAN INI ADA (Bukan monevStatus string biasa)
            return {
                id: item.id,
                title: item.title || "Tanpa Judul",
                meetingType: item.meetingType,
                status: item.status || item.meetingStatus,

                // ✅ Mengembalikan objek monev, bukan string biasa
                monev: {
                    status: monevSummary,
                    // Bisa ditambahkan properti lain jika diperlukan di masa depan
                },

                contactPerson: item.contactPerson || "-",
                contactPhone: item.phone || "",
                executionDate: item.executionDate
            }
        })

        return {
            success: true,
            data: {
                ...stats,
                directorChartData,
                listData // Return data tabel juga
            }
        }

    } catch (error) {
        console.error("[DASHBOARD_STATS_ERROR]", error)
        return { success: false, error: "Gagal memuat statistik" }
    }
}