"use client"

import { useState, useEffect } from "react"
import { DashboardStats, AgendaTableItem, TableFilter } from "@/lib/types/dashboard"
import { toast } from "sonner"
import { getDashboardStats } from "@/server/actions/dashboard-actions"
import { DateRange } from "react-day-picker"

// Komponen lain
import { DateRangePicker } from "../ui/date-range-picker"
import { RakordirCard } from "./stat-cards/rakordir-card"
import { RadirCard } from "./stat-cards/radir-card"
import { TindakLanjutCard } from "./stat-cards/tindak-lanjut-card"
import { AttendanceBarChart } from "./charts/attendance-bar-chart"
import { FilterBadge } from "../ui/filter-badge"
import { DashboardAgendaTable } from "./dashboard-agenda-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Filter, ListTodo } from "lucide-react"
import { Button } from "../ui/button"

// TAMBAHKAN: komponen onboarding tour
import OnboardingTour from "@/components/dashboard/onboarding-tour"

export function DashboardClient() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
    })

    const [stats, setStats] = useState<DashboardStats>({
        rakordir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, ditunda: 0, selesai: 0, dibatalkan: 0, total: 0 },
        radir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, ditunda: 0, selesai: 0, dibatalkan: 0, total: 0 },
        followUp: { radir: { inProgress: 0, done: 0, total: 0 }, rakordir: { inProgress: 0, done: 0, total: 0 } },
        directorChartData: [],
        listData: []
    })

    const [loading, setLoading] = useState(true)
    const [tableFilter, setTableFilter] = useState<TableFilter>({})
    const [filteredTableData, setFilteredTableData] = useState<AgendaTableItem[]>([])

    useEffect(() => {
        const fetchData = async () => {
            if (!date?.from || !date?.to) return

            setLoading(true)
            try {
                const res = await getDashboardStats({ from: date.from, to: date.to })
                if (res.success && res.data) {
                    const raw = res.data

                    // Mapping directorChartData: present → attendance
                    const mappedChart = (raw.directorChartData || []).map(item => ({
                        name: item.name,
                        attendance: item.present ?? 0,      // konversi utama
                        total: item.total ?? 0,
                        percentage: item.percentage ?? 0,
                        fill: item.fill,
                    }))

                    // Validasi listData agar sesuai AgendaTableItem
                    const validatedList = (raw.listData || []).map(item => ({
                        id: item.id ?? "",
                        title: item.title ?? "",
                        meetingType: item.meetingType ?? "",
                        status: item.status ?? "",
                        monevStatus: item.monevStatus ?? "",
                        contactPerson: item.contactPerson ?? "",
                        contactPhone: item.contactPhone ?? "",
                        executionDate: item.executionDate ?? null,
                    })) satisfies AgendaTableItem[]

                    setStats({
                        ...raw,
                        directorChartData: mappedChart,
                        listData: validatedList,
                    } as DashboardStats)  // assertion aman setelah mapping

                    setFilteredTableData(validatedList)
                }
            } catch (error) {
                console.error("Error fetching dashboard stats:", error)
                toast.error("Gagal mengambil data dashboard")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [date])

    useEffect(() => {
        if (!stats.listData.length) return

        let filtered = [...stats.listData]

        if (tableFilter.meetingType) {
            filtered = filtered.filter(item => item.meetingType === tableFilter.meetingType)
        }

        if (tableFilter.status) {
            const filterStatus = tableFilter.status
            const statusMap: Record<string, string[]> = {
                RAPAT_SELESAI: ["RAPAT_SELESAI", "COMPLETED"],
                DIJADWALKAN: ["DIJADWALKAN", "SCHEDULED"],
                DIBATALKAN: ["DIBATALKAN", "CANCELLED"],
                DRAFT: ["DRAFT"],
                DAPAT_DILANJUTKAN: ["DAPAT_DILANJUTKAN"],
                DITUNDA: ["DITUNDA"]
            }

            filtered = filtered.filter(item => {
                const status = item.status ?? ""
                const allowed = statusMap[filterStatus]
                return allowed ? allowed.includes(status) : status === filterStatus
            })
        }

        setFilteredTableData(filtered)
    }, [tableFilter, stats.listData])

    const handleCardClick = (
        meetingType: "RAKORDIR" | "RADIR",
        status: string,
        label: string
    ) => {
        setTableFilter({
            meetingType,
            status,
            clearLabel: `${label} - ${meetingType === "RAKORDIR" ? "Rapat Koordinasi" : "Rapat Direksi"}`
        })

        setTimeout(() => {
            document.getElementById("agenda-table-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            })
        }, 100)
    }

    const clearFilter = () => {
        setTableFilter({})

        // Pastikan data asli sudah ada sebelum di-set
        if (stats.listData?.length) {
            setFilteredTableData([...stats.listData])  // copy array baru agar trigger re-render
        } else {
            setFilteredTableData([])
        }

        // Optional: scroll ke atas tabel jika perlu
        setTimeout(() => {
            document.getElementById("agenda-table-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            })
        }, 100)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* TAMBAHKAN: Tour helper (non-invasive) */}
            <OnboardingTour />

            {/* HEADER & FILTER */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-[#125d72] tracking-tight">Executive Dashboard</h2>
                    <p className="text-slate-500 font-medium">Ringkasan aktivitas rapat dan performa kehadiran.</p>
                </div>
                <DateRangePicker date={date} setDate={setDate} />
            </div>

            {/* TOP ROW: 3 CARDS */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <RakordirCard data={stats.rakordir} loading={loading} onCardClick={handleCardClick} />
                <RadirCard data={stats.radir} loading={loading} onCardClick={handleCardClick} />
                <TindakLanjutCard data={stats.followUp} loading={loading} />
            </div>

            {/* BAR CHART */}
            <AttendanceBarChart data={stats.directorChartData} loading={loading} />

            {/* TABEL */}
            <div id="agenda-table-section">
                <Card className="shadow-xl border border-slate-200 rounded-2xl bg-white overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black text-[#125d72] uppercase tracking-wide flex items-center gap-2">
                                        <ListTodo className="h-5 w-5" /> Daftar Seluruh Agenda
                                    </CardTitle>
                                    <CardDescription className="font-medium text-slate-500">
                                        Monitoring detail status rapat, monev, dan narahubung
                                        {tableFilter.clearLabel && (
                                            <span className="ml-2 text-amber-600">
                                                • Filter aktif: {tableFilter.clearLabel}
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>

                                {tableFilter.clearLabel && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilter}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        <Filter className="h-3 w-3 mr-1" />
                                        Clear Filter
                                    </Button>
                                )}
                            </div>

                            <FilterBadge filter={tableFilter} filteredCount={filteredTableData.length} />
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {loading ? (
                            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                                Memuat data tabel...
                            </div>
                        ) : (
                            <DashboardAgendaTable
                                data={filteredTableData}
                                initialFilters={tableFilter}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}