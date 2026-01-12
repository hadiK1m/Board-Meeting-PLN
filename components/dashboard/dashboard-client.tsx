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
    Users
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

export function DashboardClient() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
    })

    const [stats, setStats] = useState({
        rakordir: { dapatDilanjutkan: 0, dijadwalkan: 0, selesai: 0, dibatalkan: 0, total: 0 },
        radir: { dapatDilanjutkan: 0, dijadwalkan: 0, selesai: 0, dibatalkan: 0, total: 0 },
        directorChartData: [] as any[]
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

            {/* --- TOP ROW: STATS CARDS --- */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* RAKORDIR CARD */}
                <Card className="border-none shadow-xl bg-linear-to-br from-[#125d72] to-[#0e4b5c] text-white rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90"><FileText className="h-5 w-5 text-[#efe62f]" /> Rakordir</CardTitle>
                        <p className="text-sm text-slate-300 font-medium">Rapat Koordinasi Direksi</p>
                    </CardHeader>
                    <CardContent className="pt-4 relative z-10">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatBox label="Dapat Dilanjutkan" value={stats.rakordir.dapatDilanjutkan} icon={ArrowRight} color="bg-white/10 text-emerald-300" isLoading={loading} />
                            <StatBox label="Dijadwalkan" value={stats.rakordir.dijadwalkan} icon={Clock} color="bg-white/10 text-blue-300" isLoading={loading} />
                            <StatBox label="Selesai" value={stats.rakordir.selesai} icon={CheckCircle2} color="bg-white/10 text-white" isLoading={loading} />
                            <StatBox label="Dibatalkan" value={stats.rakordir.dibatalkan} icon={XCircle} color="bg-white/10 text-red-300" isLoading={loading} />
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Agenda</span>
                            <span className="text-2xl font-black">{loading ? "-" : stats.rakordir.total}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* RADIR CARD */}
                <Card className="border-none shadow-xl bg-linear-to-br from-[#14a2ba] to-[#118a9e] text-white rounded-2xl overflow-hidden relative">
                    <div className="absolute bottom-0 left-0 p-32 bg-white/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90"><BarChart3 className="h-5 w-5 text-white" /> Rapat Direksi</CardTitle>
                        <p className="text-sm text-blue-100 font-medium">Pengambilan Keputusan Tertinggi</p>
                    </CardHeader>
                    <CardContent className="pt-4 relative z-10">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatBox label="Dapat Dilanjutkan" value={stats.radir.dapatDilanjutkan} icon={ArrowRight} color="bg-white/20 text-white" isLoading={loading} />
                            <StatBox label="Dijadwalkan" value={stats.radir.dijadwalkan} icon={Clock} color="bg-white/20 text-white" isLoading={loading} />
                            <StatBox label="Selesai" value={stats.radir.selesai} icon={CheckCircle2} color="bg-white/20 text-white" isLoading={loading} />
                            <StatBox label="Dibatalkan" value={stats.radir.dibatalkan} icon={XCircle} color="bg-white/20 text-red-200" isLoading={loading} />
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Agenda</span>
                            <span className="text-2xl font-black">{loading ? "-" : stats.radir.total}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- BOTTOM ROW: FULL WIDTH ATTENDANCE CHART --- */}
            <Card className="shadow-xl border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-black text-[#125d72] uppercase tracking-wide flex items-center gap-2">
                                <Users className="h-5 w-5" /> Persentase Kehadiran Direksi
                            </CardTitle>
                            <CardDescription className="font-medium text-slate-500">
                                Akumulasi kehadiran berdasarkan rapat yang telah selesai (Radir & Rakordir)
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 h-100">
                    {loading ? (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                            <ArrowRight className="h-8 w-8 text-slate-300 animate-spin" />
                            <p className="text-sm text-slate-400 font-medium">Memuat data kehadiran...</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.directorChartData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                                barSize={40}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    angle={-15} // Miringkan sedikit text axis x agar muat
                                    textAnchor="end"
                                    height={60}
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
        </div>
    )
}

function StatBox({ label, value, icon: Icon, color, isLoading }: any) {
    return (
        <div className={cn("p-3 rounded-xl flex flex-col justify-between h-24 transition-all hover:scale-105 cursor-default shadow-sm border border-white/10", color)}>
            <div className="flex justify-between items-start">
                <Icon className="h-5 w-5 opacity-80" />
                {isLoading ? <div className="h-6 w-8 bg-current opacity-20 rounded animate-pulse"></div> : <span className="text-2xl font-black tracking-tight">{value}</span>}
            </div>
            <span className="text-[10px] font-bold uppercase opacity-80 leading-tight">{label}</span>
        </div>
    )
}