"use client"

import { useState, useMemo } from "react"
import {
    Search,
    LayoutGrid,
    List,
    Eye,
    Calendar,
    Clock,
    MoreHorizontal,
    Copy,
    FileEdit,
    Undo2
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"
import { DetailJadwalSheet } from "./detail-jadwal-sheet"
import { EditScheduleDialog } from "./edit-schedule-dialog"

// ✅ Penyesuaian Import: Menggunakan rollbackMeetingScheduleAction dari meeting-actions.ts
import { rollbackMeetingScheduleAction } from "@/server/actions/meeting-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface AgendaReady {
    id: string
    title: string
    urgency: string
    deadline: Date
    initiator: string
    status: string
    meetingType?: string | null
    director?: string | null
    support?: string | null
    contactPerson?: string | null
    position?: string | null
    phone?: string | null
    legalReview?: string | null
    riskReview?: string | null
    complianceReview?: string | null
    recommendationNote?: string | null
    presentationMaterial?: string | null
    executionDate?: string | null
    startTime?: string | null
    endTime?: string | null
    meetingMethod?: string | null
    meetingLocation?: string | null
    meetingLink?: string | null
}

export function JadwalRapatClient({ data }: { data: AgendaReady[] }) {
    console.log("DATA DI CLIENT (Jadwal Rapat):", {
        totalData: data.length,
        scheduledData: data.filter(item => item.status === "DIJADWALKAN").length,
        rakordirData: data.filter(item =>
            item.meetingType === "RAKORDIR" ||
            item.title.toLowerCase().includes("rakordir")
        ).length,
        radirData: data.filter(item =>
            item.meetingType === "RADIR" ||
            !item.title.toLowerCase().includes("rakordir")
        ).length,
        sampleItems: data.slice(0, 3).map(item => ({
            title: item.title,
            status: item.status,
            meetingType: item.meetingType,
            executionDate: item.executionDate
        }))
    });

    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [searchTerm, setSearchTerm] = useState("")
    const [meetingTypeFilter, setmeetingTypeFilter] = useState("all")
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // Modal & Sheet States
    const [selectedDetail, setSelectedDetail] = useState<AgendaReady | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedEdit, setSelectedEdit] = useState<AgendaReady | null>(null)
    const [editOpen, setEditOpen] = useState(false)

    const formatShortTime = (time: string | null | undefined) => {
        if (!time || time === "Selesai") return time || "-";
        return time.split(':').slice(0, 2).join(':');
    };

    // Filter untuk tabel utama (yang sudah dijadwalkan)
    const filteredData = useMemo(() => {
        return data.filter(item => {
            // ✅ FIX 1: Filter hanya agenda dengan status DIJADWALKAN
            const isVisibleInTable =
                item.status === "DIJADWALKAN" ||
                item.status === "RAPAT_SELESAI" ||
                item.status === "SELESAI";

            if (!isVisibleInTable) return false;

            // ✅ FIX 2: Search filter
            const matchesSearch =
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.initiator || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.director || "").toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            // ✅ FIX 3: Meeting type filter (RADIR vs RAKORDIR)
            const isRakordir = item.meetingType === "RAKORDIR" ||
                item.title.toLowerCase().includes("rakordir") ||
                (item.initiator || "").toLowerCase().includes("rakordir");

            if (meetingTypeFilter === "all") return true;
            if (meetingTypeFilter === "radir") return !isRakordir;
            if (meetingTypeFilter === "rakordir") return isRakordir;

            return true;
        });
    }, [data, searchTerm, meetingTypeFilter]);

    const availableAgendas = useMemo(() => {
        return data.filter(item => {
            // Normalisasi status agar tahan terhadap perbedaan penulisan (case-insensitive)
            const s = item.status?.toUpperCase().trim().replace(/\s+/g, '_') || "";

            return s === "DAPAT_DILANJUTKAN" || item.status === "Dapat Dilanjutkan";
        });
    }, [data]);

    // ✅ DEBUG: Cek available agendas
    console.log("AVAILABLE AGENDAS (Dapat Dijadwalkan):", availableAgendas.length);

    const handleRollback = async (id: string, title: string) => {
        if (!confirm(`Apakah Anda yakin ingin membatalkan jadwal untuk agenda "${title}"? Agenda akan dikembalikan ke status 'Dapat Dilanjutkan'.`)) {
            return
        }

        try {
            // ✅ Menggunakan fungsi rollbackMeetingScheduleAction yang baru
            const res = await rollbackMeetingScheduleAction(id)
            if (res.success) {
                toast.success("Jadwal agenda berhasil dibatalkan")
                setSelectedIds(prev => prev.filter(item => item !== id))
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error("Terjadi kesalahan sistem")
        }
    }

    const handleCopyWA = () => {
        const selectedAgendas = filteredData.filter(item => selectedIds.includes(item.id))
        if (selectedAgendas.length === 0) return

        const firstAgenda = selectedAgendas[0]

        // ✅ Fungsi Helper untuk menghilangkan detik (:00)
        const formatTime = (time: string | null | undefined) => {
            if (!time || time === "Selesai") return "Selesai";
            return time.split(':').slice(0, 2).join(':'); // Ambil jam:menit saja
        };

        const dateStr = firstAgenda.executionDate ? format(new Date(firstAgenda.executionDate), "EEEE, dd MMMM yyyy", { locale: id }) : "-"
        const timeStr = `${formatTime(firstAgenda.startTime)} - ${formatTime(firstAgenda.endTime)}`

        const method = firstAgenda.meetingMethod?.toUpperCase()
        let methodText = "secara tatap muka"
        if (method === "ONLINE") methodText = "secara daring (online)"
        if (method === "HYBRID") methodText = "secara luring dan daring (hybrid)"

        let locationDetail = ""
        if (method === "OFFLINE" || method === "HYBRID") {
            locationDetail += `📍  Ruang: ${firstAgenda.meetingLocation || "-"}\n`
        }
        if (method === "ONLINE" || method === "HYBRID") {
            locationDetail += `🌐  Link: ${firstAgenda.meetingLink || "-"}\n`
        }

        // ✅ GUNAKAN meetingType (Sesuai dengan Page.tsx dan Drizzle Schema)
        const hasRadir = selectedAgendas.some(a => {
            if (a.meetingType) {
                return a.meetingType === "RADIR";
            }
            // Fallback: cek dari title atau initiator
            return !a.title.toLowerCase().includes("rakordir") &&
                !(a.initiator || "").toLowerCase().includes("rakordir");
        });

        const hasRakordir = selectedAgendas.some(a => {
            if (a.meetingType) {
                return a.meetingType === "RAKORDIR";
            }
            // Fallback: cek dari title atau initiator
            return a.title.toLowerCase().includes("rakordir") ||
                (a.initiator || "").toLowerCase().includes("rakordir");
        });

        let meetingTitle = ""
        if (hasRadir && hasRakordir) meetingTitle = "Rapat Direksi dan Rapat Koordinasi Direksi"
        else if (hasRadir) meetingTitle = "Rapat Direksi"
        else if (hasRakordir) meetingTitle = "Rapat Koordinasi Direksi"

        const radirAgendas = selectedAgendas.filter(a =>
            a.meetingType === "RADIR" ||
            (!a.meetingType && !a.title.toLowerCase().includes("rakordir"))
        )
        const rakordirAgendas = selectedAgendas.filter(a =>
            a.meetingType === "RAKORDIR" ||
            a.title.toLowerCase().includes("rakordir")
        )

        let agendaText = ""
        let counter = 1

        if (radirAgendas.length > 0) {
            agendaText += `*RADIR*\n\n`
            radirAgendas.forEach(a => {
                agendaText += `${counter++}. *${a.title}*\n\nDirektur Pemrakarsa: ${a.director || "-"}\n\nPemrakarsa: ${a.initiator || "-"}\n\nSupport: ${a.support || "-"}\n\n`
            })
        }

        if (rakordirAgendas.length > 0) {
            agendaText += `*RAKORDIR*\n\n`
            rakordirAgendas.forEach(a => {
                agendaText += `${counter++}. *${a.title}*\n\nDirektur Pemrakarsa: ${a.director || "-"}\n\nPemrakarsa: ${a.initiator || "-"}\n\nSupport: ${a.support || "-"}\n\n`
            })
        }

        const template = `*UNDANGAN ${meetingTitle.toUpperCase()}*

Ykh. Bapak/Ibu 
• BoD Holding
• KSPI
• SEVP HKK
• KSDTI
• Senior Leaders

Dengan ini dimohon untuk berkenan hadir dalam *${meetingTitle}* yang akan dilaksanakan ${methodText} pada :

🗓  Hari, tanggal: ${dateStr}
⏰️  Pukul: ${timeStr}
${locationDetail}
AGENDA

${agendaText}Terimakasih dan salam hormat, 🙏🏼🙏🏼
_SEKPER PLN_`

        navigator.clipboard.writeText(template)
        toast.success("Undangan WhatsApp Berhasil Disalin!")
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredData.length) setSelectedIds([])
        else setSelectedIds(filteredData.map(item => item.id))
    }

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#125d72]">Jadwal Rapat</h1>
                    <p className="text-slate-500 font-medium text-[10px] uppercase tracking-[0.2em]">Monitoring Pelaksanaan Rapat Direksi</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <Button
                            onClick={handleCopyWA}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg gap-2 animate-in fade-in slide-in-from-right-2"
                        >
                            <Copy className="h-4 w-4" /> Copy Undangan WA ({selectedIds.length})
                        </Button>
                    )}
                    <ScheduleMeetingDialog availableAgendas={availableAgendas} />
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl border shadow-sm flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-75">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari agenda yang sudah dijadwalkan..."
                        className="pl-10 h-11 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-[#14a2ba]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={meetingTypeFilter} onValueChange={setmeetingTypeFilter}>
                    <SelectTrigger className="w-44 h-11 border-slate-200 font-semibold text-[#125d72] focus:ring-[#14a2ba]">
                        <SelectValue placeholder="Jenis Rapat" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Rapat</SelectItem>
                        <SelectItem value="radir">RADIR</SelectItem>
                        <SelectItem value="rakordir">RAKORDIR</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")} className={cn("h-9", viewMode === "table" && "bg-white text-[#14a2ba] shadow-sm")}><List className="h-4 w-4" /></Button>
                    <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className={cn("h-9", viewMode === "grid" && "bg-white text-[#14a2ba] shadow-sm")}><LayoutGrid className="h-4 w-4" /></Button>
                </div>
            </div>

            {viewMode === "table" ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#f8fafc] border-b">
                            <TableRow>
                                <TableHead className="w-12 px-6">
                                    <Checkbox checked={selectedIds.length === filteredData.length && filteredData.length > 0} onCheckedChange={toggleSelectAll} />
                                </TableHead>
                                <TableHead className="w-[40%] min-w-75 text-[#125d72] font-black uppercase text-[11px]">Agenda & Waktu</TableHead>
                                <TableHead className="text-[#125d72] font-black uppercase text-[11px] text-center">Metode</TableHead>
                                <TableHead className="text-[#125d72] font-black uppercase text-[11px] text-center">Status</TableHead>
                                <TableHead className="text-right text-[#125d72] font-black uppercase text-[11px] pr-6">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? filteredData.map((agenda) => (
                                <TableRow key={agenda.id} className={cn("hover:bg-slate-50/50 group border-b last:border-0", selectedIds.includes(agenda.id) && "bg-blue-50/50")}>
                                    <TableCell className="px-6 text-center">
                                        <Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} />
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="space-y-1">
                                            <p
                                                className="font-bold text-[#125d72] uppercase text-xs tracking-tight line-clamp-2 max-w-2xl"
                                                title={agenda.title}
                                            >
                                                {agenda.title}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-[#14a2ba]" /> {agenda.executionDate ? format(new Date(agenda.executionDate), "dd MMM yyyy", { locale: id }) : "-"}</span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-[#14a2ba]" />
                                                    {formatShortTime(agenda.startTime)} - {formatShortTime(agenda.endTime)}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-blue-100 text-blue-700 text-[10px] font-bold uppercase border-none px-3">{agenda.meetingMethod}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn(
                                            "text-[10px] font-bold px-3 py-0.5 rounded-full uppercase border-none",
                                            agenda.status === "RAPAT_SELESAI" || agenda.status === "SELESAI"
                                                ? "bg-emerald-100 text-emerald-700" // Warna hijau untuk selesai
                                                : "bg-[#125d72] text-white"         // Warna biru untuk dijadwalkan
                                        )}>
                                            {agenda.status?.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                                                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-2xl border-none">
                                                <DropdownMenuItem onClick={() => { setSelectedDetail(agenda); setDetailOpen(true); }} className="rounded-lg py-2.5 font-bold text-[#125d72] cursor-pointer">
                                                    <Eye className="mr-3 h-4 w-4 text-[#14a2ba]" /> Lihat Detail
                                                </DropdownMenuItem>
                                                {/* ✅ LOGIKA BARU: Tombol Batalkan Jadwal hanya muncul jika status DIJADWALKAN */}
                                                {agenda.status === "DIJADWALKAN" && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => { setSelectedEdit(agenda); setEditOpen(true); }} className="rounded-lg font-bold text-amber-600 focus:bg-amber-50 cursor-pointer text-xs">
                                                            <FileEdit className="mr-2 h-3.5 w-3.5" /> Edit Jadwal
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="my-2" />
                                                        <DropdownMenuItem
                                                            onClick={() => handleRollback(agenda.id, agenda.title)}
                                                            className="rounded-lg py-2.5 font-bold text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                                        >

                                                            <Undo2 className="mr-3 h-4 w-4" /> Batalkan Jadwal
                                                        </DropdownMenuItem>

                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-xs italic">Belum ada agenda yang dijadwalkan.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((agenda) => (
                        <div key={agenda.id} className={cn("bg-white border rounded-2xl p-6 shadow-sm border-slate-100 hover:shadow-md transition-all relative group", selectedIds.includes(agenda.id) ? "border-[#14a2ba] bg-blue-50/20" : "border-slate-100")}>
                            <div className="absolute top-4 right-4 z-10">
                                <Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} />
                            </div>
                            <div className="flex flex-col gap-2 mb-4">
                                <Badge className="bg-[#125d72] text-white text-[10px] font-bold uppercase w-fit">DIJADWALKAN</Badge>
                                <Badge variant="outline" className="text-[9px] font-bold uppercase w-fit border-blue-200 text-blue-600 bg-blue-50">{agenda.meetingMethod}</Badge>
                            </div>
                            <h3 className="font-bold text-[#125d72] text-sm uppercase line-clamp-2 h-10 mb-4 tracking-tight leading-snug">{agenda.title}</h3>
                            <div className="space-y-3 border-t pt-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><Calendar className="h-3.5 w-3.5 text-[#14a2ba]" /> {agenda.executionDate ? format(new Date(agenda.executionDate), "dd MMM yyyy", { locale: id }) : "-"}</div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Clock className="h-3.5 w-3.5 text-[#14a2ba]" />
                                    {formatShortTime(agenda.startTime)} - {formatShortTime(agenda.endTime)}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-5">
                                <Button variant="ghost" onClick={() => { setSelectedDetail(agenda); setDetailOpen(true); }} className="bg-slate-50 text-[#125d72] text-[10px] font-bold uppercase rounded-xl">Detail</Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase rounded-xl">Aksi</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-none shadow-xl">

                                        {/* ✅ LOGIKA BARU: Batasi tombol Batal Jadwal di tampilan Grid */}
                                        {agenda.status === "DIJADWALKAN" && (
                                            <DropdownMenuItem
                                                onClick={() => handleRollback(agenda.id, agenda.title)}
                                                className="rounded-lg font-bold text-red-600 focus:bg-red-50 cursor-pointer text-xs"
                                            >
                                                <DropdownMenuItem onClick={() => { setSelectedEdit(agenda); setEditOpen(true); }} className="rounded-lg font-bold text-amber-600 focus:bg-amber-50 cursor-pointer text-xs">
                                                    <FileEdit className="mr-2 h-3.5 w-3.5" /> Edit Jadwal
                                                </DropdownMenuItem>
                                                <Undo2 className="mr-2 h-3.5 w-3.5" /> Batal Jadwal
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <DetailJadwalSheet agenda={selectedDetail} open={detailOpen} onOpenChange={setDetailOpen} />
            <EditScheduleDialog agenda={selectedEdit} open={editOpen} onOpenChange={setEditOpen} />
        </div>
    )
}