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
        const data = await db.query.agendas.findMany({
            where: and(
                gte(agendas.updatedAt, filter.from),
                lte(agendas.updatedAt, filter.to)
            ),
            orderBy: [desc(agendas.updatedAt)]
        })

        const stats = {
            rakordir: { dapatDilanjutkan: 0, dijadwalkan: 0, selesai: 0, dibatalkan: 0, total: 0 },
            radir: { dapatDilanjutkan: 0, dijadwalkan: 0, selesai: 0, dibatalkan: 0, total: 0 },
            // ✅ TAMBAHAN: Data Tindak Lanjut
            followUp: {
                radir: { inProgress: 0, done: 0 },
                rakordir: { inProgress: 0, done: 0 }
            },
            directorStats: {} as Record<string, { present: number, total: number, percentage: number }>
        }

        Object.values(DIRECTORS_MAP).forEach(shortName => {
            stats.directorStats[shortName] = { present: 0, total: 0, percentage: 0 }
        })

        for (const item of data) {
            const type = item.meetingType === "RAKORDIR" ? "rakordir" : "radir"

            // 1. Hitung Status Agenda
            if (item.meetingStatus === "CANCELLED") stats[type].dibatalkan++
            else if (item.status === "RAPAT_SELESAI" || item.meetingStatus === "COMPLETED") {
                stats[type].selesai++

                // 2. Hitung Kehadiran
                if (item.attendanceData) {
                    try {
                        const attendance = typeof item.attendanceData === 'string'
                            ? JSON.parse(item.attendanceData)
                            : item.attendanceData

                        Object.keys(DIRECTORS_MAP).forEach(longName => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const record = (attendance as any)[longName]
                            const shortName = DIRECTORS_MAP[longName]
                            if (record) {
                                stats.directorStats[shortName].total++
                                if (record.status === "Hadir") stats.directorStats[shortName].present++
                            }
                        })
                    } catch (e) { console.error(e) }
                }

                // ✅ 3. Hitung Status Tindak Lanjut (Monev)
                // Kita hitung per ITEM keputusan/arahan, bukan per agenda
                if (item.meetingDecisions) {
                    try {
                        const decisions = Array.isArray(item.meetingDecisions)
                            ? item.meetingDecisions
                            : JSON.parse(item.meetingDecisions as string)

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        decisions.forEach((d: any) => {
                            if (d.status === "DONE") {
                                stats.followUp[type].done++
                            } else {
                                stats.followUp[type].inProgress++
                            }
                        })
                    } catch (e) { console.error("Error parse decisions", e) }
                }

            }
            else if (item.meetingStatus === "SCHEDULED") stats[type].dijadwalkan++
            else if (item.status === "DAPAT_DILANJUTKAN") stats[type].dapatDilanjutkan++

            stats[type].total++
        }

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

        return { success: true, data: { ...stats, directorChartData } }

    } catch (error) {
        console.error("[DASHBOARD_STATS_ERROR]", error)
        return { success: false, error: "Gagal memuat statistik" }
    }
}