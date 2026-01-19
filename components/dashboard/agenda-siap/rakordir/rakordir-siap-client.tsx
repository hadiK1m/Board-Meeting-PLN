"use client"

import * as React from "react"
import { useState, useMemo } from "react"
// 1. Import komponen baru - TAMBAHKAN di bagian import
import { Clock } from "lucide-react"
import { TundaRakordirSiapDialog } from "./tunda-rakordir-siap-dialog"
import {
    Search,
    LayoutGrid,
    List,
    Eye,
    MoreHorizontal,
    Phone,
    X,
    Trash2,
    AlertCircle,
    FileSpreadsheet,
    Play,
    CheckSquare,
    CalendarPlus
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
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
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import * as XLSX from "xlsx"

// UI Components
import { Checkbox } from "@/components/ui/checkbox"
import { BulkScheduleRakordirDialog } from "./bulk-schedule-rakordir-dialog"
import { DetailRakordirSiapSheet } from "./detail-rakordir-siap-sheet"
import { BatalRakordirSiapDialog } from "./batal-rakordir-siap-dialog"

// Server Actions
import { resumeAgendaAction, deleteBulkAgendasAction } from "@/server/actions/agenda-actions"

export interface AgendaReady {
    id: string
    title: string
    urgency: string
    deadline: Date
    initiator: string
    status: string
    contactPerson: string
    cancellationReason?: string | null
    postponedReason?: string | null
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

interface RakordirSiapClientProps {
    data: AgendaReady[]
}

export function RakordirSiapClient({ data }: RakordirSiapClientProps) {
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [tundaOpen, setTundaOpen] = useState(false)
    const [selectedForTunda, setSelectedForTunda] = useState<AgendaReady | null>(null)

    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // States untuk Modal/Sheet
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<AgendaReady | null>(null)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [selectedForCancel, setSelectedForCancel] = useState<AgendaReady | null>(null)

    const filteredData = useMemo(() => {
        return data
            .filter(item => (item.status || "").toLowerCase() !== "draft")
            .filter((item) => {
                const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.initiator.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesStatus = statusFilter === "all" || item.status === statusFilter

                return matchesSearch && matchesStatus
            })
    }, [data, searchTerm, statusFilter])

    const selectedAgendas = useMemo(() => {
        return filteredData.filter(a => selectedIds.includes(a.id))
    }, [filteredData, selectedIds])

    const hasCancelled = selectedAgendas.some(a => a.status === "DIBATALKAN")
    const hasScheduled = selectedAgendas.some(a => a.status === "DIJADWALKAN" || a.status === "SELESAI")
    const canScheduleBulk = selectedIds.length > 0 && !hasCancelled && !hasScheduled

    const handleExportExcel = () => {
        if (selectedAgendas.length === 0) {
            toast.error("Pilih agenda yang ingin diexport")
            return
        }
        const exportData = selectedAgendas.map((a, index) => ({
            No: index + 1,
            Judul: a.title,
            Pemrakarsa: a.initiator,
            Status: a.status,
            Deadline: format(new Date(a.deadline), "dd/MM/yyyy"),
            PIC: a.contactPerson,
            Phone: a.phone || "-",
            "Alasan Batal": a.cancellationReason || "-"
        }))
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rakordir Siap")
        XLSX.writeFile(workbook, `Export_Rakordir_Siap_${format(new Date(), "ddMMyy")}.xlsx`)
        toast.success(`${selectedAgendas.length} Agenda berhasil diexport`)
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredData.length && filteredData.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredData.map(item => item.id))
        }
    }

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const handleBulkDelete = async () => {
        if (hasScheduled) {
            toast.error("Agenda yang sudah dijadwalkan tidak boleh dihapus.")
            return
        }
        if (!confirm(`Hapus permanen ${selectedIds.length} agenda terpilih?`)) return
        try {
            const res = await deleteBulkAgendasAction(selectedIds)
            if (res.success) {
                toast.success("Agenda berhasil dibersihkan")
                setSelectedIds([])
            }
        } catch {
            toast.error("Gagal menghapus data")
        }
    }

    const handleResume = async (id: string, title: string) => {
        const isConfirmed = confirm(`Apakah Anda yakin ingin melanjutkan kembali agenda "${title}"?`);
        if (!isConfirmed) return;
        try {
            const res = await resumeAgendaAction(id);
            if (res.success) toast.success("Agenda berhasil dilanjutkan kembali");
            else toast.error(res.error || "Gagal melanjutkan agenda");
        } catch {
            toast.error("Terjadi kesalahan sistem");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1 border-l-4 border-[#14a2ba] pl-4">
                    <h1 className="text-2xl md:text-3xl font-black text-[#125d72] tracking-tight uppercase">Rakordir Siap</h1>
                    <p className="text-slate-500 font-medium text-sm italic">Agenda rapat koordinasi direksi tervalidasi</p>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            {canScheduleBulk ? (
                                <BulkScheduleRakordirDialog selectedAgendas={selectedAgendas} onSuccess={() => setSelectedIds([])} />
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-700 uppercase italic animate-pulse">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {hasCancelled ? "Terdapat Agenda Dibatalkan" : "Agenda Sudah Terjadwal"}
                                </div>
                            )}
                            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-10 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold px-4 rounded-xl uppercase text-[10px]">
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export ({selectedIds.length})
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-10 font-bold px-4 rounded-xl uppercase text-[10px]">
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-red-500">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full md:min-w-62.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Cari agenda rakordir..." className="pl-10 h-11 bg-slate-50 border-none focus-visible:ring-[#14a2ba]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-45 h-11 border-slate-200 font-bold text-[#125d72]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="DAPAT_DILANJUTKAN">Dapat Dilanjutkan</SelectItem>
                        <SelectItem value="DIJADWALKAN">Dijadwalkan</SelectItem>
                        <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                    <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")} className={cn("h-9 w-9 p-0", viewMode === "table" && "bg-white text-[#14a2ba] shadow-sm")}><List className="h-4 w-4" /></Button>
                    <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className={cn("h-9 w-9 p-0", viewMode === "grid" && "bg-white text-[#14a2ba] shadow-sm")}><LayoutGrid className="h-4 w-4" /></Button>
                </div>
            </div>

            {viewMode === "table" ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#f8fafc] border-b">
                            <TableRow>
                                <TableHead className="w-12 px-4 text-center">
                                    <Checkbox checked={selectedIds.length === filteredData.length && filteredData.length > 0} onCheckedChange={toggleSelectAll} />
                                </TableHead>
                                <TableHead className="w-[35%] min-w-75 text-[#125d72] font-extrabold uppercase text-[11px] pl-2 tracking-wider">Agenda Rapat</TableHead>
                                <TableHead className="w-[20%] text-[#125d72] font-extrabold uppercase text-[11px] tracking-wider">NARAHUBUNG (PIC)</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] text-center tracking-wider">Status</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] pl-6 tracking-wider">Catatan Pembatalan</TableHead>
                                <TableHead className="text-right text-[#125d72] font-extrabold uppercase text-[11px] pr-6 tracking-wider">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? (
                                filteredData.map((agenda) => (
                                    <TableRow key={agenda.id} className={cn("hover:bg-slate-50/50 transition-colors", selectedIds.includes(agenda.id) && "bg-[#14a2ba]/5")}>
                                        <TableCell className="px-4 text-center">
                                            <Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} />
                                        </TableCell>
                                        <TableCell className="py-5 pl-2 align-top">
                                            <div className="space-y-1 max-w-87.5">
                                                <p className="font-bold text-[#125d72] uppercase text-xs tracking-tight line-clamp-2 leading-snug">{agenda.title}</p>
                                                <span className="text-[10px] text-slate-400 font-medium block mt-1 uppercase">DEADLINE: {format(new Date(agenda.deadline), "dd/MM/yyyy")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top py-5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-slate-700">{agenda.contactPerson}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">{agenda.position || "-"}</span>
                                                {agenda.phone && (
                                                    <a href={`https://wa.me/${agenda.phone.replace(/[^0-9]/g, '')}`} target="_blank" className="text-[10px] text-emerald-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 bg-emerald-50 w-fit px-1.5 py-0.5 rounded">
                                                        <Phone className="h-2.5 w-2.5" /> {agenda.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center align-top py-5">
                                            <Badge className={cn("text-[10px] font-bold px-3 py-0.5 rounded-full uppercase shadow-none",
                                                agenda.status === "DIBATALKAN" ? "bg-red-100 text-red-600" :
                                                    agenda.status === "DITUNDA" ? "bg-amber-100 text-amber-600" : // ✅ TAMBAHKAN KONDISI DITUNDA
                                                        agenda.status === "DIJADWALKAN" ? "bg-blue-100 text-blue-600" :
                                                            "bg-[#125d72] text-white")}>
                                                {agenda.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="pl-6 align-top py-5">
                                            {agenda.cancellationReason ? (
                                                <div className="flex items-start gap-2 max-w-45 bg-red-50 p-2 rounded-md border border-red-100">
                                                    <CheckSquare className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                                                    <p className="text-[10px] text-red-600 italic leading-snug line-clamp-3 overflow-hidden">{agenda.cancellationReason}</p>
                                                </div>
                                            ) : <span className="text-slate-300 text-[11px]">-</span>}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 align-top py-5">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-full"><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl shadow-2xl border-none">
                                                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 px-2 py-1.5">Aksi</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => { setSelectedDetail(agenda); setDetailOpen(true); }} className="rounded-lg py-2.5 cursor-pointer font-bold text-[#125d72]">
                                                        <Eye className="mr-3 h-4 w-4 text-[#14a2ba]" /> Lihat Detail
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />

                                                    {/* ✅ UPDATE LOGIKA INI: */}
                                                    {agenda.status === "DIBATALKAN" || agenda.status === "DITUNDA" ? ( // ✅ TAMBAHKAN kondisi DITUNDA
                                                        <DropdownMenuItem onClick={() => handleResume(agenda.id, agenda.title)} className="rounded-lg py-2.5 cursor-pointer font-bold text-green-600">
                                                            <Play className="mr-3 h-4 w-4" /> Lanjutkan Agenda
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <>
                                                            {/* ✅ TAMBAHKAN TOMBOL TUNDA: */}
                                                            <DropdownMenuItem
                                                                onClick={() => { setSelectedForTunda(agenda); setTundaOpen(true); }}
                                                                className="rounded-lg py-2.5 cursor-pointer font-bold text-amber-600"
                                                            >
                                                                <Clock className="mr-3 h-4 w-4" /> Tunda Agenda
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => { setSelectedForCancel(agenda); setCancelOpen(true); }}
                                                                className="rounded-lg py-2.5 cursor-pointer font-bold text-red-600 focus:bg-red-50"
                                                            >
                                                                <Trash2 className="mr-3 h-4 w-4" /> Batalkan Agenda
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400 text-xs italic">Data tidak ditemukan.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((agenda) => (
                        <div key={agenda.id} className={cn("bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-slate-100 group relative", selectedIds.includes(agenda.id) && "border-[#14a2ba] ring-1 ring-[#14a2ba]/30")}>
                            <div className="absolute top-4 left-4 z-10"><Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} /></div>
                            <div className="flex items-center justify-between mb-4 pl-6">
                                <Badge className={cn("text-[10px] font-bold px-3 uppercase",
                                    agenda.status === "DIBATALKAN" ? "bg-red-500 text-white" :
                                        agenda.status === "DITUNDA" ? "bg-amber-500 text-white" : // ✅ TAMBAHKAN KONDISI DITUNDA
                                            agenda.status === "DIJADWALKAN" ? "bg-blue-500 text-white" :
                                                "bg-[#125d72] text-white")}>
                                    {agenda.status.replace(/_/g, ' ')}
                                </Badge>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedDetail(agenda); setDetailOpen(true); }} className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"><Eye className="h-4 w-4 text-[#14a2ba]" /></Button>
                            </div>
                            <h3 className="font-bold text-[#125d72] text-sm uppercase line-clamp-2 mb-4 h-10 leading-snug">{agenda.title}</h3>
                            <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between mt-auto">
                                <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Deadline Usulan</p><p className="text-xs font-bold text-[#125d72]">{format(new Date(agenda.deadline), "dd MMM yyyy")}</p></div>
                                <CalendarPlus className="h-5 w-5 text-[#14a2ba] opacity-40" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODALS */}
            <DetailRakordirSiapSheet agenda={selectedDetail} open={detailOpen} onOpenChange={setDetailOpen} />
            <BatalRakordirSiapDialog agenda={selectedForCancel} open={cancelOpen} onOpenChange={setCancelOpen} variant="dropdown" />
            <TundaRakordirSiapDialog agenda={selectedForTunda} open={tundaOpen} onOpenChange={setTundaOpen} />
        </div>
    )
}