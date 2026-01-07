"use client"

import { useState, useMemo } from "react"
import {
    Search,
    LayoutGrid,
    List,
    Download,
    Eye,
    Info,
    MoreHorizontal,
    Play
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
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { DetailAgendaSheet } from "./detail-agenda-sheet"
import { CancelAgendaDialog } from "./cancel-agenda-dialog"
import { resumeAgendaAction } from "@/server/actions/agenda-actions"

// ✅ Pastikan interface ini match dengan output di page.tsx
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
    const [dateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    })

    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<AgendaReady | null>(null)

    const filteredData = useMemo(() => {
        return data
            .filter(item => (item.status || "").toLowerCase() !== "draft")
            .filter((item) => {
                const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.initiator.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesStatus = statusFilter === "all" || item.status === statusFilter

                let matchesDate = true
                if (dateRange.from && dateRange.to) {
                    matchesDate = isWithinInterval(new Date(item.deadline), {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.to),
                    })
                }
                return matchesSearch && matchesStatus && matchesDate
            })
    }, [data, searchTerm, statusFilter, dateRange])

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
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#125d72]">Radir Siap</h1>
                    <p className="text-slate-500 font-medium">Manajemen agenda yang telah divalidasi</p>
                </div>
                <Button variant="outline" className="border-slate-200 text-slate-600 font-bold shadow-sm">
                    <Download className="mr-2 h-4 w-4" /> Export Agenda
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-75">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari agenda siap..."
                        className="pl-10 h-11 bg-slate-50 border-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-56 h-11">
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

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <Button
                        variant={viewMode === "table" ? "secondary" : "ghost"}
                        size="sm" onClick={() => setViewMode("table")}
                        className={cn("h-9", viewMode === "table" && "bg-white text-[#14a2ba]")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm" onClick={() => setViewMode("grid")}
                        className={cn("h-9", viewMode === "grid" && "bg-white text-[#14a2ba]")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {viewMode === "table" ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#f8fafc] border-b">
                            <TableRow>
                                <TableHead className="w-100 text-[#125d72] font-extrabold uppercase text-[11px] pl-6">
                                    Agenda Rapat
                                </TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] text-center">Status</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] pl-6">Catatan Pembatalan</TableHead>
                                <TableHead className="text-right text-[#125d72] font-extrabold uppercase text-[11px] pr-6">Opsi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((agenda) => (
                                <TableRow key={agenda.id} className="hover:bg-slate-50/50 group border-b last:border-0">
                                    <TableCell className="py-5 pl-6">
                                        <div className="space-y-1">
                                            <p className="font-bold text-[#125d72] uppercase text-xs tracking-tight">{agenda.title}</p>
                                            <span className="text-[10px] text-slate-400 font-medium">DEADLINE: {format(new Date(agenda.deadline), "dd/MM/yyyy")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn("text-[10px] font-bold px-3 py-0.5 rounded-full uppercase",
                                            agenda.status === "DIBATALKAN" ? "bg-red-100 text-red-600" : "bg-[#125d72] text-white")}>
                                            {agenda.status.replace(/_/g, ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pl-6">
                                        {agenda.cancellationReason ? (
                                            <div className="flex items-start gap-2 max-w-xs">
                                                <Info className="h-3 w-3 text-red-400 mt-0.5" />
                                                <p className="text-[11px] text-red-500 italic leading-snug">{agenda.cancellationReason}</p>
                                            </div>
                                        ) : <span className="text-slate-300 text-[11px]">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
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
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((agenda) => (
                        <div key={agenda.id} className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-slate-100">
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
                            <h3 className="font-bold text-[#125d72] text-sm uppercase line-clamp-2 mb-4 h-10">{agenda.title}</h3>
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