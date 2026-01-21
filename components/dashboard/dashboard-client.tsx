/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    FileText,
    XCircle,
    BarChart3,
    ArrowRight,
    Users,
    ListTodo,
    Activity,
    File,
    PauseCircle
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getDashboardStats } from "@/server/actions/dashboard-actions"
import { toast } from "sonner"
import { DashboardAgendaTable, AgendaTableItem } from "./dashboard-agenda-table"

export function DashboardClient() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
    })

    const [stats, setStats] = useState({
        rakordir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, ditunda: 0, selesai: 0, dibatalkan: 0, total: 0 },
        radir: { draft: 0, dapatDilanjutkan: 0, dijadwalkan: 0, ditunda: 0, selesai: 0, dibatalkan: 0, total: 0 },
        followUp: { radir: { inProgress: 0, done: 0, total: 0 }, rakordir: { inProgress: 0, done: 0, total: 0 } },
        directorChartData: [] as any[],
        listData: [] as AgendaTableItem[]
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            if (!date?.from || !date?.to) return
            setLoading(true)
            try {
                const res = await getDashboardStats({ from: date.from, to: date.to })
                if (res.success && res.data) {
                    setStats(res.data as any)
                }
            } catch (error) {
                toast.error("Gagal mengambil data dashboard")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [date])

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* HEADER & FILTER */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-[#125d72] tracking-tight">Executive Dashboard</h2>
                    <p className="text-slate-500 font-medium">Ringkasan aktivitas rapat dan performa kehadiran.</p>
                </div>
                <div className="grid gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-65 justify-start text-left font-semibold h-11 rounded-xl border-slate-300 shadow-sm hover:bg-slate-50", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 text-[#125d72]" />
                                {date?.from ? (date.to ? <>{format(date.from, "dd MMM yyyy", { locale: id })} - {format(date.to, "dd MMM yyyy", { locale: id })}</> : format(date.from, "dd MMM yyyy", { locale: id })) : <span>Pilih Tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* TOP ROW: 3 CARDS */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

                {/* 1. RAKORDIR CARD */}
                <Card className="border-none shadow-xl bg-linear-to-br from-[#125d72] to-[#0e4b5c] text-white rounded-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-24 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none group-hover:bg-white/10 transition-all"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90"><FileText className="h-5 w-5 text-[#efe62f]" /> Rakordir</CardTitle>
                        <p className="text-xs text-slate-300 font-medium uppercase tracking-wide">Rapat Koordinasi</p>
                    </CardHeader>
                    <CardContent className="pt-4 relative z-10">
                        <div className="grid grid-cols-3 gap-3">
                            <StatBox label="Draft" value={stats.rakordir.draft} icon={File} color="bg-white/10 text-slate-300" isLoading={loading} />
                            <StatBox label="Dapat Dilanjut" value={stats.rakordir.dapatDilanjutkan} icon={ArrowRight} color="bg-white/10 text-emerald-300" isLoading={loading} />
                            <StatBox label="Dijadwalkan" value={stats.rakordir.dijadwalkan} icon={Clock} color="bg-white/10 text-blue-300" isLoading={loading} />
                            <StatBox label="Ditunda" value={stats.rakordir.ditunda} icon={PauseCircle} color="bg-white/10 text-amber-300" isLoading={loading} />
                            <StatBox label="Selesai" value={stats.rakordir.selesai} icon={CheckCircle2} color="bg-white/10 text-white" isLoading={loading} />
                            <StatBox label="Dibatalkan" value={stats.rakordir.dibatalkan} icon={XCircle} color="bg-white/10 text-red-300" isLoading={loading} />
                        </div>
                        <div className="mt-5 pt-3 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total Agenda (Semua Status)</span>
                            <span className="text-xl font-black">{loading ? "-" : stats.rakordir.total}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. RADIR CARD */}
                <Card className="border-none shadow-xl bg-linear-to-br from-[#14a2ba] to-[#118a9e] text-white rounded-2xl overflow-hidden relative group">
                    <div className="absolute bottom-0 left-0 p-24 bg-white/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none group-hover:bg-white/15 transition-all"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90"><BarChart3 className="h-5 w-5 text-white" /> Rapat Direksi</CardTitle>
                        <p className="text-xs text-blue-100 font-medium uppercase tracking-wide">Rapat Keputusan</p>
                    </CardHeader>
                    <CardContent className="pt-4 relative z-10">
                        <div className="grid grid-cols-3 gap-3">
                            <StatBox label="Draft" value={stats.radir.draft} icon={File} color="bg-white/20 text-blue-100" isLoading={loading} />
                            <StatBox label="Dapat Dilanjut" value={stats.radir.dapatDilanjutkan} icon={ArrowRight} color="bg-white/20 text-white" isLoading={loading} />
                            <StatBox label="Dijadwalkan" value={stats.radir.dijadwalkan} icon={Clock} color="bg-white/20 text-white" isLoading={loading} />
                            <StatBox label="Ditunda" value={stats.radir.ditunda} icon={PauseCircle} color="bg-white/20 text-amber-200" isLoading={loading} />
                            <StatBox label="Selesai" value={stats.radir.selesai} icon={CheckCircle2} color="bg-white/20 text-white" isLoading={loading} />
                            <StatBox label="Dibatalkan" value={stats.radir.dibatalkan} icon={XCircle} color="bg-white/20 text-red-200" isLoading={loading} />
                        </div>
                        <div className="mt-5 pt-3 border-t border-white/20 flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Total Agenda (Semua Status)</span>
                            <span className="text-xl font-black">{loading ? "-" : stats.radir.total}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. TINDAK LANJUT CARD */}
                <Card className="border-none shadow-xl bg-linear-to-br from-slate-700 to-slate-800 text-white rounded-2xl overflow-hidden relative group">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-24 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90"><ListTodo className="h-5 w-5 text-purple-400" /> Tindak Lanjut</CardTitle>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Monitoring & Evaluasi</p>
                    </CardHeader>
                    <CardContent className="pt-4 relative z-10 space-y-4">

                        {/* Section Keputusan Radir */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-300">
                                <span>Keputusan Radir</span>
                                <Activity className="h-3 w-3 text-slate-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MonevStatBox
                                    label="In Progress"
                                    value={stats.followUp.radir.inProgress}
                                    total={stats.followUp.radir.total}
                                    color="bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    isLoading={loading}
                                />
                                <MonevStatBox
                                    label="Selesai"
                                    value={stats.followUp.radir.done}
                                    total={stats.followUp.radir.total}
                                    color="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                    isLoading={loading}
                                />
                            </div>
                        </div>

                        {/* Section Arahan Rakordir */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-300">
                                <span>Arahan Rakordir</span>
                                <Activity className="h-3 w-3 text-slate-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MonevStatBox
                                    label="In Progress"
                                    value={stats.followUp.rakordir.inProgress}
                                    total={stats.followUp.rakordir.total}
                                    color="bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    isLoading={loading}
                                />
                                <MonevStatBox
                                    label="Selesai"
                                    value={stats.followUp.rakordir.done}
                                    total={stats.followUp.rakordir.total}
                                    color="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                    isLoading={loading}
                                />
                            </div>
                        </div>

                        {/* Total Tindak Lanjut */}
                        <div className="pt-3 border-t border-white/10">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Total Tindak Lanjut:</span>
                                <span className="font-bold text-white">
                                    {loading ? "-" :
                                        (stats.followUp.radir.total + stats.followUp.rakordir.total)
                                    }
                                </span>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* CHART PERSENTASE KEHADIRAN */}
            <Card className="shadow-xl border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-black text-[#125d72] uppercase tracking-wide flex items-center gap-2">
                                <Users className="h-5 w-5" /> Persentase Kehadiran Direksi
                            </CardTitle>
                            <CardDescription className="font-medium text-slate-500">
                                Akumulasi kehadiran per direktur berdasarkan rapat RADIR yang telah selesai
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 h-112.5">
                    {loading ? (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                            <ArrowRight className="h-8 w-8 text-slate-300 animate-spin" />
                            <p className="text-sm text-slate-400 font-medium">Memuat data kehadiran...</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.directorChartData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                                barSize={45}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    angle={-25}
                                    textAnchor="end"
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    unit="%"
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100 text-xs">
                                                    <p className="font-black text-[#125d72] mb-1 text-sm">{data.name}</p>
                                                    <div className="space-y-1">
                                                        <p className="text-slate-600">Hadir: <span className="font-bold text-emerald-600">{data.present}</span></p>
                                                        <p className="text-slate-600">Total Undangan: <span className="font-bold text-slate-800">{data.total}</span></p>
                                                        <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                            <div className="h-full bg-[#125d72]" style={{ width: `${data.percentage}%` }}></div>
                                                        </div>
                                                        <p className="text-right font-bold mt-1">{data.percentage}%</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                                    {stats.directorChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* TABEL DAFTAR SELURUH AGENDA */}
            <Card className="shadow-xl border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-black text-[#125d72] uppercase tracking-wide flex items-center gap-2">
                            <ListTodo className="h-5 w-5" /> Daftar Seluruh Agenda
                        </CardTitle>
                        <CardDescription className="font-medium text-slate-500">
                            Monitoring detail status rapat, monev, dan narahubung
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                            Memuat data tabel...
                        </div>
                    ) : (
                        <DashboardAgendaTable data={stats.listData || []} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function StatBox({ label, value, icon: Icon, color, isLoading }: any) {
    return (
        <div className={cn("p-3 rounded-xl flex flex-col justify-between h-20 transition-all hover:scale-105 cursor-default shadow-sm border border-white/5", color)}>
            <div className="flex justify-between items-start">
                <Icon className="h-4 w-4 opacity-70" />
                {isLoading ? <div className="h-5 w-8 bg-current opacity-20 rounded animate-pulse"></div> : <span className="text-xl font-black tracking-tight">{value}</span>}
            </div>
            <span className="text-[9px] font-bold uppercase opacity-80 leading-tight">{label}</span>
        </div>
    )
}

function MonevStatBox({ label, value, total, color, isLoading }: any) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <div className={cn("px-3 py-2 rounded-lg flex flex-col border h-14 transition-all hover:brightness-110 cursor-default", color)}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase opacity-90">{label}</span>
                {isLoading ? (
                    <div className="h-4 w-6 bg-current opacity-20 rounded animate-pulse"></div>
                ) : (
                    <span className="text-sm font-black">{value}</span>
                )}
            </div>
            {!isLoading && total > 0 && (
                <div className="mt-1 flex items-center justify-between">
                    <span className="text-[9px] opacity-70">dari {total}</span>
                    <span className="text-[9px] font-bold">{percentage}%</span>
                </div>
            )}
        </div>
    )
}