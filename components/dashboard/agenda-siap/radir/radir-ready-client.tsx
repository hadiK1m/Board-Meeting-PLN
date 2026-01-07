"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
    Search,
    LayoutGrid,
    List,
    Download,
    Eye,
    Info,
    MoreHorizontal,
    Play,
    Phone,
    Calendar as CalendarIcon, // Icon Kalender
    X
} from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar" // Pastikan komponen Calendar ada
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { DateRange } from "react-day-picker"

import { DetailAgendaSheet } from "./detail-agenda-sheet"
import { CancelAgendaDialog } from "./cancel-agenda-dialog"
import { resumeAgendaAction } from "@/server/actions/agenda-actions"

// ✅ Interface Updated
export interface AgendaReady {
    id: string
    title: string
    urgency: string
    deadline: Date
    initiator: string
    status: string
    contactPerson: string
    cancellationReason?: string | null
    director?: string | null
    support?: string | null
    position?: string | null
    phone?: string | null
    legalReview?: string | null
    riskReview?: string | null
    complianceReview?: string | null
    recommendationNote?: string | null
    presentationMaterial?: string | null
}

interface RadirReadyClientProps {
    data: AgendaReady[]
}

export function RadirReadyClient({ data }: RadirReadyClientProps) {
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")

    // ✅ State untuk Filter Tanggal
    const [date, setDate] = useState<DateRange | undefined>(undefined)

    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<AgendaReady | null>(null)

    const filteredData = useMemo(() => {
        return data
            .filter(item => (item.status || "").toLowerCase() !== "draft")
            .filter((item) => {
                const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.initiator.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesStatus = statusFilter === "all" || item.status === statusFilter

                // ✅ Logika Filter Tanggal
                let matchesDate = true
                if (date?.from) {
                    const itemDate = new Date(item.deadline)
                    // Jika hanya 'from' yang dipilih (tanggal tunggal) atau range lengkap
                    const start = startOfDay(date.from)
                    const end = date.to ? endOfDay(date.to) : endOfDay(date.from)

                    matchesDate = isWithinInterval(itemDate, { start, end })
                }

                return matchesSearch && matchesStatus && matchesDate
            })
    }, [data, searchTerm, statusFilter, date])

    const handleOpenDetail = (agenda: AgendaReady) => {
        setSelectedDetail(agenda)
        setDetailOpen(true)
    }

    const handleResume = async (id: string, title: string) => {
        const isConfirmed = confirm(`Apakah Anda yakin ingin melanjutkan kembali agenda "${title}"?`);
        if (!isConfirmed) return;

        try {
            const res = await resumeAgendaAction(id);
            if (res.success) {
                toast.success("Agenda berhasil dilanjutkan kembali");
            } else {
                toast.error(res.error || "Gagal melanjutkan agenda");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1 border-l-4 border-[#14a2ba] pl-4">
                    <h1 className="text-2xl md:text-3xl font-black text-[#125d72] tracking-tight uppercase">
                        Radir Siap
                    </h1>
                    <p className="text-slate-500 font-medium">Manajemen agenda rapat direksi yang telah divalidasi</p>
                </div>
                <Button variant="outline" className="border-slate-200 text-slate-600 font-bold shadow-sm">
                    <Download className="mr-2 h-4 w-4" /> Export Agenda
                </Button>
            </div>

            {/* --- FILTER BAR --- */}
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* Search Input */}
                <div className="relative flex-1 w-full md:min-w-62.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari agenda siap..."
                        className="pl-10 h-11 bg-slate-50 border-none focus-visible:ring-[#14a2ba]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-45 h-11 border-slate-200">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="DAPAT_DILANJUTKAN">Dapat Dilanjutkan</SelectItem>
                        <SelectItem value="DIJADWALKAN">Dijadwalkan</SelectItem>
                        <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
                        <SelectItem value="SELESAI">Selesai</SelectItem>
                    </SelectContent>
                </Select>

                {/* ✅ Date Picker Filter */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full md:w-60 h-11 justify-start text-left font-normal border-slate-200",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-[#14a2ba]" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "dd MMM", { locale: localeID })} -{" "}
                                            {format(date.to, "dd MMM yyyy", { locale: localeID })}
                                        </>
                                    ) : (
                                        format(date.from, "dd MMMM yyyy", { locale: localeID })
                                    )
                                ) : (
                                    <span>Filter Tanggal</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                locale={localeID}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Tombol Reset Tanggal */}
                    {date && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDate(undefined)}
                            className="h-11 w-11 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                    <Button
                        variant={viewMode === "table" ? "secondary" : "ghost"}
                        size="sm" onClick={() => setViewMode("table")}
                        className={cn("h-9 w-9 p-0", viewMode === "table" && "bg-white text-[#14a2ba] shadow-sm")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm" onClick={() => setViewMode("grid")}
                        className={cn("h-9 w-9 p-0", viewMode === "grid" && "bg-white text-[#14a2ba] shadow-sm")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* --- CONTENT --- */}
            {viewMode === "table" ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#f8fafc] border-b">
                            <TableRow>
                                {/* ✅ Batasi Lebar Kolom Agenda */}
                                <TableHead className="w-[35%] min-w-75 text-[#125d72] font-extrabold uppercase text-[11px] pl-6 tracking-wider">
                                    Agenda Rapat
                                </TableHead>
                                {/* ✅ Kolom Baru: Narahubung */}
                                <TableHead className="w-[20%] text-[#125d72] font-extrabold uppercase text-[11px] tracking-wider">
                                    Narahubung (PIC)
                                </TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] text-center tracking-wider">
                                    Status
                                </TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] pl-6 tracking-wider">
                                    Catatan Pembatalan
                                </TableHead>
                                <TableHead className="text-right text-[#125d72] font-extrabold uppercase text-[11px] pr-6 tracking-wider">
                                    Opsi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? (
                                filteredData.map((agenda) => (
                                    <TableRow key={agenda.id} className="hover:bg-slate-50/50 group border-b last:border-0">

                                        {/* Agenda & Deadline */}
                                        <TableCell className="py-5 pl-6 align-top">
                                            <div className="space-y-1 max-w-87.5">
                                                <p
                                                    className="font-bold text-[#125d72] uppercase text-xs tracking-tight line-clamp-2 leading-snug"
                                                    title={agenda.title}
                                                >
                                                    {agenda.title}
                                                </p>
                                                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                                                    DEADLINE: {format(new Date(agenda.deadline), "dd/MM/yyyy")}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Narahubung */}
                                        <TableCell className="align-top py-5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {agenda.contactPerson}
                                                </span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">
                                                    {agenda.position || "-"}
                                                </span>
                                                {agenda.phone && (
                                                    <a
                                                        href={`https://wa.me/${agenda.phone.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] text-emerald-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 bg-emerald-50 w-fit px-1.5 py-0.5 rounded"
                                                    >
                                                        <Phone className="h-2.5 w-2.5" />
                                                        {agenda.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="text-center align-top py-5">
                                            <Badge className={cn("text-[10px] font-bold px-3 py-0.5 rounded-full uppercase shadow-none",
                                                agenda.status === "DIBATALKAN" ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-[#125d72] text-white hover:bg-[#0e4b5d]")}>
                                                {agenda.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>

                                        {/* Catatan */}
                                        <TableCell className="pl-6 align-top py-5">
                                            {agenda.cancellationReason ? (
                                                <div className="flex items-start gap-2 max-w-xs bg-red-50 p-2 rounded-md border border-red-100">
                                                    <Info className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                                                    <p className="text-[10px] text-red-600 italic leading-snug">
                                                        {agenda.cancellationReason}
                                                    </p>
                                                </div>
                                            ) : <span className="text-slate-300 text-[11px]">-</span>}
                                        </TableCell>

                                        {/* Opsi */}
                                        <TableCell className="text-right pr-6 align-top py-5">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl shadow-2xl border-none">
                                                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 px-2 py-1.5">Aksi Agenda</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        onClick={() => handleOpenDetail(agenda)}
                                                        className="rounded-lg py-2.5 cursor-pointer font-bold text-[#125d72]"
                                                    >
                                                        <Eye className="mr-3 h-4 w-4 text-[#14a2ba]" /> Lihat Detail
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />

                                                    {agenda.status === "DIBATALKAN" ? (
                                                        <DropdownMenuItem
                                                            onClick={() => handleResume(agenda.id, agenda.title)}
                                                            className="rounded-lg py-2.5 cursor-pointer font-bold text-green-600 focus:bg-green-50 focus:text-green-600"
                                                        >
                                                            <Play className="mr-3 h-4 w-4" /> Lanjutkan Agenda
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <div className="p-1">
                                                            <CancelAgendaDialog
                                                                agendaId={agenda.id}
                                                                agendaTitle={agenda.title}
                                                                variant="dropdown"
                                                            />
                                                        </div>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-xs italic">
                                        Data tidak ditemukan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((agenda) => (
                        <div key={agenda.id} className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-slate-100 group">
                            <div className="flex items-center justify-between mb-4">
                                <Badge className={cn("text-[10px] font-bold px-3 uppercase",
                                    agenda.status === "DIBATALKAN" ? "bg-red-500 text-white" : "bg-[#125d72] text-white")}>
                                    {agenda.status.replace(/_/g, ' ')}
                                </Badge>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(agenda)} className="h-8 w-8 p-0 rounded-full">
                                        <Eye className="h-4 w-4 text-[#14a2ba]" />
                                    </Button>
                                    {agenda.status === "DIBATALKAN" ? (
                                        <Button variant="ghost" size="sm" onClick={() => handleResume(agenda.id, agenda.title)} className="h-8 w-8 p-0 rounded-full text-green-600">
                                            <Play className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <CancelAgendaDialog agendaId={agenda.id} agendaTitle={agenda.title} />
                                    )}
                                </div>
                            </div>
                            <h3 className="font-bold text-[#125d72] text-sm uppercase line-clamp-2 mb-4 h-10 leading-snug" title={agenda.title}>
                                {agenda.title}
                            </h3>

                            {/* Info Narahubung di Grid */}
                            <div className="mb-4 pt-3 border-t border-slate-50">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Narahubung</p>
                                <p className="text-xs font-bold text-slate-700">{agenda.contactPerson}</p>
                                <p className="text-[10px] text-slate-500">{agenda.position || "-"}</p>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Deadline</p>
                                    <p className="text-xs font-bold text-[#125d72]">
                                        {format(new Date(agenda.deadline), "dd MMM yyyy")}
                                    </p>
                                </div>
                                {agenda.phone && (
                                    <a
                                        href={`https://wa.me/${agenda.phone.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-emerald-100 p-2 rounded-full text-emerald-600 hover:bg-emerald-200 transition-colors"
                                    >
                                        <Phone className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <DetailAgendaSheet
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                agenda={selectedDetail as any}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    )
}