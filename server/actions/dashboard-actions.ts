/* eslint-disable @typescript-eslint/no-unused-vars */
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

// Helper function untuk parse data JSON
const parseJsonData = (data: any): any[] => {
    if (!data) return [];

    try {
        // Jika sudah array
        if (Array.isArray(data)) {
            return data;
        }

        // Jika string JSON
        if (typeof data === 'string') {
            let cleanString = data.trim();

            // Handle kasus: '"[]"' (JSON string dalam string)
            if (cleanString.startsWith('"') && cleanString.endsWith('"')) {
                cleanString = cleanString.slice(1, -1);
            }

            // Handle escape characters
            cleanString = cleanString.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

            const parsed = JSON.parse(cleanString);

            if (Array.isArray(parsed)) {
                return parsed;
            } else if (parsed && typeof parsed === 'object') {
                return Object.values(parsed);
            }
        }

        // Jika object
        if (typeof data === 'object' && data !== null) {
            return Object.values(data);
        }
    } catch (e) {
        // Silent error, return empty array
    }

    return [];
}

// Helper function untuk format monev status
const formatMonevStatus = (status: string): string => {
    if (!status || status === "null" || status === "undefined") return "Tidak Ada Arahan";

    const statusMap: Record<string, string> = {
        "DONE": "Selesai",
        "ON_PROGRESS": "In Progress",
        "IN_PROGRESS": "In Progress",
        "PENDING": "Menunggu",
        "NOT_STARTED": "Belum Mulai",
        "CANCELLED": "Dibatalkan",
        "SELESAI": "Selesai",
        "PROGRESS": "In Progress",
        "COMPLETED": "Selesai",
        "-": "-"
    };

    const upperStatus = status.toUpperCase().trim();
    return statusMap[upperStatus] || (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase());
}

export async function getDashboardStats(filter: DashboardFilter) {
    try {
        // ------------------------------------------------------------------
        // 1. SETUP DATE RANGE
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
            rakordir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, ditunda: 0, selesai: 0, dibatalkan: 0, total: 0 },
            radir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, ditunda: 0, selesai: 0, dibatalkan: 0, total: 0 },
            followUp: {
                radir: { inProgress: 0, done: 0, total: 0 },
                rakordir: { inProgress: 0, done: 0, total: 0 }
            },
            directorStats: {} as Record<string, { present: number, total: number, percentage: number }>,
            listData: [] as any[]
        }

        // Init Data Direksi
        Object.values(DIRECTORS_MAP).forEach(shortName => {
            stats.directorStats[shortName] = { present: 0, total: 0, percentage: 0 }
        })

        // ------------------------------------------------------------------
        // 4. LOOPING PENGOLAHAN DATA
        // ------------------------------------------------------------------
        for (const item of data) {
            const type = item.meetingType === "RAKORDIR" ? "rakordir" : "radir"
            const status = item.status || item.meetingStatus || "";

            // A. HITUNG STATUS RAPAT
            if (status === "DRAFT") {
                stats[type].draft++
            }
            else if (status === "DAPAT_DILANJUTKAN") {
                stats[type].dapatDilanjutkan++
            }
            else if (status === "DIJADWALKAN") {
                stats[type].dijadwalkan++
            }
            else if (status === "DITUNDA") {
                stats[type].ditunda++
            }
            else if (status === "RAPAT_SELESAI" || status === "COMPLETED") {
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
                    } catch (e) { /* Ignore error */ }
                }

                // C. HITUNG STATUS MONEV / TINDAK LANJUT
                // ------------------------------------------------------------------
                // C. HITUNG STATUS MONEV / TINDAK LANJUT
                // ------------------------------------------------------------------
                let decisions: any[] = [];

                if (item.meetingType === "RADIR") {
                    // RADIR: hanya dari meetingDecisions
                    decisions = parseJsonData(item.meetingDecisions);
                } else if (item.meetingType === "RAKORDIR") {
                    // RAKORDIR: Coba dari berbagai sumber
                    const sources = [
                        parseJsonData(item.meetingDecisions),  // Sumber utama
                        parseJsonData(item.arahanDireksi)      // Sumber alternatif
                    ];

                    // Gabungkan semua, filter yang valid
                    decisions = sources.flat().filter(d =>
                        d && d.status && (d.status.includes("PROGRESS") || d.status.includes("DONE"))
                    );

                    // Jika masih kosong, coba format lain
                    if (decisions.length === 0 && item.arahanDireksi) {
                        try {
                            const arahan = parseJsonData(item.arahanDireksi);
                            // Jika arahan punya text tapi tidak punya status, anggap sebagai IN_PROGRESS
                            decisions = arahan.filter(d => d && d.text).map(d => ({
                                ...d,
                                status: d.status || "ON_PROGRESS"  // Default status
                            }));
                        } catch (e) {
                            // Ignore error
                        }
                    }
                }

                // Hitung statistik (sama seperti sebelumnya)
                if (decisions.length > 0) {
                    const doneCount = decisions.filter((d: any) => {
                        if (!d || !d.status) return false;
                        const status = String(d.status).toUpperCase().trim();
                        return status === "DONE" || status === "SELESAI" || status === "COMPLETED";
                    }).length;

                    const inProgressCount = decisions.filter((d: any) => {
                        if (!d || !d.status) return false;
                        const status = String(d.status).toUpperCase().trim();
                        return status === "ON_PROGRESS" ||
                            status === "IN_PROGRESS" ||
                            status === "PROGRESS";
                    }).length;

                    stats.followUp[type].done += doneCount;
                    stats.followUp[type].inProgress += inProgressCount;
                    stats.followUp[type].total += decisions.length;
                }
            }
            else if (status === "DIBATALKAN" || status === "CANCELLED") {
                stats[type].dibatalkan++
            }
            else {
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
            let decisions: any[] = [];
            let monevSummary = "";

            if (item.meetingType === "RADIR") {
                decisions = parseJsonData(item.meetingDecisions);
            } else if (item.meetingType === "RAKORDIR") {
                decisions = parseJsonData(item.arahanDireksi);
            }

            if (decisions.length > 0) {
                const doneCount = decisions.filter((d: any) => {
                    if (!d || !d.status) return false;
                    const status = String(d.status).toUpperCase().trim();
                    return status === "DONE" || status === "SELESAI" || status === "COMPLETED";
                }).length;
                const totalCount = decisions.length;

                if (doneCount === totalCount) {
                    monevSummary = `Selesai (${doneCount}/${totalCount})`
                } else if (doneCount === 0) {
                    const hasInProgress = decisions.some((d: any) => {
                        if (!d || !d.status) return false;
                        const status = String(d.status).toUpperCase().trim();
                        return status === "ON_PROGRESS" ||
                            status === "IN_PROGRESS" ||
                            status === "PROGRESS";
                    });

                    if (hasInProgress) {
                        monevSummary = `In Progress (0/${totalCount})`
                    } else {
                        monevSummary = `Belum Dieksekusi (0/${totalCount})`
                    }
                } else {
                    monevSummary = `In Progress (${doneCount}/${totalCount})`
                }
            } else {
                const meetingStatus = item.status || item.meetingStatus || "";
                const isMeetingCompleted = meetingStatus === "RAPAT_SELESAI" || meetingStatus === "COMPLETED";
                const isMeetingDraft = meetingStatus === "DRAFT";
                const isMeetingScheduled = meetingStatus === "DIJADWALKAN";
                const isMeetingPostponed = meetingStatus === "DITUNDA";

                if (isMeetingDraft || isMeetingScheduled || isMeetingPostponed) {
                    monevSummary = "-"
                } else if (isMeetingCompleted) {
                    if (item.monevStatus) {
                        monevSummary = formatMonevStatus(item.monevStatus);
                    } else {
                        monevSummary = "Tidak Ada Arahan"
                    }
                } else {
                    monevSummary = "Menunggu Rapat"
                }
            }

            return {
                id: item.id,
                title: item.title || "Tanpa Judul",
                meetingType: item.meetingType,
                status: item.status || item.meetingStatus,
                monevStatus: monevSummary,
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
                listData
            }
        }

    } catch (error) {
        console.error("[DASHBOARD_STATS_ERROR]", error)
        return { success: false, error: "Gagal memuat statistik" }
    }
}