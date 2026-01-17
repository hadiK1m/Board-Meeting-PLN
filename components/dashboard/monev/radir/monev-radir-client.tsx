/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
    Search,
    Filter,
    MoreHorizontal,
    Edit,
    Download,
    ExternalLink,
    CheckCircle2,
    Clock,
    LayoutGrid,
    List,
    Calendar,
    Target,
    Phone,
    ArrowRight
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { toast } from "sonner"
import { MonevUpdateDialog } from "./monev-update-dialog"
import { getRisalahDownloadUrlAction } from "@/server/actions/radir-actions"
import { getEvidenceUrlAction } from "@/server/actions/monev-radir-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MonevAddDialog } from "./monev-add-dialog"

interface DecisionItem {
    id: string
    text: string
    targetOutput?: string
    currentProgress?: string
    evidencePath?: string
    status: "ON_PROGRESS" | "DONE"
}

interface MonevItem {
    id: string
    title: string
    meetingNumber: string | null
    meetingYear: string | null
    executionDate: string | null
    initiator: string | null
    contactPerson: string | null
    position: string | null
    phone: string | null
    risalahTtd: string | null
    petikanRisalah: string | null // ✅ Added: Agar data petikan risalah terbaca
    monevStatus: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meetingDecisions: DecisionItem[] | any
}

interface MonevRadirClientProps {
    initialData: MonevItem[]
}

export function MonevRadirClient({ initialData }: MonevRadirClientProps) {
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_PROGRESS" | "DONE">("ALL")
    const [yearFilter, setYearFilter] = useState<string>("ALL")

    const [dialogOpen, setDialogOpen] = useState(false)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [selectedAgenda, setSelectedAgenda] = useState<MonevItem | null>(null)

    const uniqueYears = Array.from(new Set(initialData.map(item => item.meetingYear)))
        .filter((year): year is string => year !== null)
        .sort().reverse()

    const filteredData = initialData.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.meetingNumber || "").toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "ALL" ? true : item.monevStatus === statusFilter
        const matchesYear = yearFilter === "ALL" ? true : item.meetingYear === yearFilter
        return matchesSearch && matchesStatus && matchesYear
    })

    const handleOpenEvidence = async (path: string | null) => {
        if (!path) return toast.error("Bukti tidak tersedia.")
        try {
            const url = await getEvidenceUrlAction(path)
            if (url) window.open(url, "_blank")
            else toast.error("Gagal membuka file.")
        } catch (_) {
            toast.error("Terjadi kesalahan.")
        }
    }

    const handleDownloadRisalah = async (path: string | null) => {
        if (!path) return toast.error("File belum tersedia.")
        try {
            const res = await getRisalahDownloadUrlAction(path)
            if (res.success && res.url) window.open(res.url, "_blank")
            else toast.error(res.error || "Gagal")
        } catch (_) {
            toast.error("Gagal mendownload file.")
        }
    }

    const openUpdateDialog = (agenda: MonevItem) => {
        setSelectedAgenda(agenda)
        setDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 border-l-4 border-[#14a2ba] pl-4">
                <h1 className="text-2xl md:text-3xl font-black text-[#125d72] tracking-tight uppercase">
                    Monitoring & Evaluasi Radir
                </h1>
                <p className="text-slate-500 font-medium text-sm italic">
                    Pemantauan dan evaluasi pelaksanaan arahan hasil rapat direksi
                </p>
            </div>
            {/* --- TOOLBAR SECTION --- */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white border border-slate-200 shadow-sm p-4 rounded-xl">
                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari Judul, Nomor Rapat..."
                        className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#125d72] focus:ring-[#125d72] transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="h-10 w-25 rounded-xl border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white transition-all">
                            <Calendar className="mr-2 h-3.5 w-3.5 text-slate-500" />
                            <SelectValue placeholder="Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua</SelectItem>
                            {uniqueYears.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(v: "ALL" | "ON_PROGRESS" | "DONE") => setStatusFilter(v)}>
                        <SelectTrigger className="h-10 w-30 rounded-xl border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white transition-all">
                            <Filter className="mr-2 h-3.5 w-3.5 text-slate-500" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua</SelectItem>
                            <SelectItem value="ON_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="DONE">Selesai</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 h-10">
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${viewMode === "grid" ? "bg-white shadow-sm text-[#125d72]" : "text-slate-400 hover:text-slate-600"}`} onClick={() => setViewMode("grid")}>
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${viewMode === "table" ? "bg-white shadow-sm text-[#125d72]" : "text-slate-400 hover:text-slate-600"}`} onClick={() => setViewMode("table")}>
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- CONTENT SECTION --- */}
            {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg">Data tidak ditemukan</h3>
                </div>
            ) : viewMode === "grid" ? (
                // GRID VIEW
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredData.map((item) => (
                        <Card key={item.id} className="rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group/card">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge className="bg-[#125d72]/10 text-[#125d72] border-none text-[10px] font-black uppercase">
                                        #{item.meetingNumber ?? "-"}
                                    </Badge>
                                    <MonevStatusBadge status={item.monevStatus ?? "ON_PROGRESS"} />
                                </div>
                                <h3 className="font-bold text-slate-800 leading-snug mb-3 line-clamp-2 min-h-10" title={item.title}>
                                    {item.title}
                                </h3>
                                {/* Info Progress Summary */}
                                <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-2">
                                    {(() => {
                                        const decision = Array.isArray(item.meetingDecisions) ? item.meetingDecisions[0] : null
                                        return decision ? (
                                            <>
                                                <div className="flex items-start gap-2 text-xs">
                                                    <Target className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                    <span className="text-slate-600 font-medium line-clamp-1">
                                                        {decision.targetOutput || "Output belum diisi"}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2 text-xs">
                                                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                    <span className="text-slate-600 line-clamp-1">
                                                        {decision.currentProgress || "Belum ada progress"}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Belum ada detail keputusan</span>
                                        )
                                    })()}
                                </div>
                                <Button
                                    className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#125d72] h-10 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                                    onClick={() => openUpdateDialog(item)}
                                >
                                    <Edit className="mr-2 h-3.5 w-3.5" /> Update Detail
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                // TABLE VIEW
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-linear-to-r from-slate-50 to-slate-100">
                            <TableRow className="border-b border-slate-200">
                                <TableHead className="w-[22%] text-[10px] font-black uppercase tracking-wider text-slate-600 pl-6">
                                    Agenda & Pemrakarsa
                                </TableHead>
                                <TableHead className="w-[16%] text-[10px] font-black uppercase tracking-wider text-slate-600">
                                    Narahubung
                                </TableHead>
                                <TableHead className="w-[12%] text-[10px] font-black uppercase tracking-wider text-slate-600 text-center">
                                    Petikan Risalah
                                </TableHead>
                                <TableHead className="w-[25%] text-[10px] font-black uppercase tracking-wider text-slate-600">
                                    Detail Keputusan
                                </TableHead>
                                <TableHead className="w-[10%] text-[10px] font-black uppercase tracking-wider text-slate-600 text-center">
                                    Status Monev
                                </TableHead>
                                <TableHead className="w-[10%] text-[10px] font-black uppercase tracking-wider text-slate-600 text-right pr-6">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filteredData.map((item) => {
                                const decisions = Array.isArray(item.meetingDecisions) ? (item.meetingDecisions as DecisionItem[]) : []
                                const firstDecision = decisions[0]
                                const doneCount = decisions.filter((d: DecisionItem) => d.status === "DONE").length
                                const decisionCount = decisions.length

                                return (
                                    <TableRow
                                        key={item.id}
                                        className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-none group"
                                    >
                                        {/* 1. PEMRAKARSA & AGENDA */}
                                        {/* Fix: min-w agar tidak terlalu sempit, whitespace-normal agar wrap */}
                                        <TableCell className="align-top py-5 pl-6 min-w-62.5">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px] font-black border-slate-300 text-slate-600 bg-white/80 px-2 py-0.5"
                                                    >
                                                        #{item.meetingNumber ?? "-"}
                                                    </Badge>
                                                    <span className="text-[10px] font-medium text-slate-500">
                                                        {item.executionDate ? format(new Date(item.executionDate), "dd MMM yyyy", { locale: id }) : "-"}
                                                    </span>
                                                </div>
                                                <p
                                                    className="font-semibold text-sm text-slate-800 leading-tight group-hover:text-[#125d72] transition-colors whitespace-normal wrap-break-word"
                                                    title={item.title}
                                                >
                                                    {item.title}
                                                </p>
                                                <div className="inline-flex bg-[#125d72]/5 text-[#125d72] text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                                                    {item.initiator || "Tanpa Pemrakarsa"}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* 2. NARAHUBUNG */}
                                        <TableCell className="align-top py-5">
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-slate-700">
                                                    {item.contactPerson || <span className="text-slate-400 italic">-</span>}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    {item.position || "-"}
                                                </p>
                                                {item.phone && (
                                                    <a
                                                        href={`https://wa.me/${item.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors border border-emerald-100/50"
                                                    >
                                                        <Phone className="h-3 w-3" /> Chat WA
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* 3. PETIKAN RISALAH (Menggunakan data petikanRisalah) */}
                                        <TableCell className="align-top py-5 text-center">
                                            {item.petikanRisalah ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[10px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                    onClick={() => handleDownloadRisalah(item.petikanRisalah)}
                                                >
                                                    <Download className="h-3.5 w-3.5 mr-1.5" /> Unduh
                                                </Button>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[9px] text-slate-400 bg-slate-100/80 font-semibold px-2.5 py-1"
                                                >
                                                    BELUM UPLOAD
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* 4. DETAIL KEPUTUSAN */}
                                        <TableCell className="align-top py-5">
                                            {firstDecision ? (
                                                <div className="space-y-3 text-xs">
                                                    <div className="flex items-start gap-2">
                                                        <div className="shrink-0 mt-0.5">
                                                            <Target className="h-3.5 w-3.5 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-600 uppercase tracking-wide text-[9px] mb-0.5">
                                                                Output
                                                            </div>
                                                            <p className="text-slate-700 leading-relaxed line-clamp-2">
                                                                {firstDecision.targetOutput || <span className="text-slate-400 italic">Belum diisi</span>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-2 pl-2 border-l-2 border-slate-200">
                                                        <div className="shrink-0 mt-0.5">
                                                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-600 uppercase tracking-wide text-[9px] mb-0.5">
                                                                Progress Terkini
                                                            </div>
                                                            <p className="text-slate-700 leading-relaxed line-clamp-2">
                                                                {firstDecision.currentProgress || <span className="text-slate-400 italic">Belum update</span>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {decisionCount > 1 && (
                                                        <div className="text-[9px] text-slate-500 italic pt-1">
                                                            +{decisionCount - 1} keputusan lainnya...
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Tidak ada keputusan</span>
                                            )}
                                        </TableCell>


                                        {/* 6. STATUS MONEV */}
                                        <TableCell className="align-top py-5 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <MonevStatusBadge status={item.monevStatus ?? "ON_PROGRESS"} />
                                                <div className="text-[9px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/50">
                                                    {doneCount} / {decisionCount} Selesai
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* 7. AKSI */}
                                        <TableCell className="align-top py-5 text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-full text-slate-400 hover:text-[#125d72] hover:bg-slate-100 transition-colors"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-52 rounded-xl shadow-xl border-slate-200 p-1"
                                                >
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2">
                                                        Aksi Monev
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="my-1" />

                                                    <DropdownMenuItem
                                                        onClick={() => openUpdateDialog(item)}
                                                        className="cursor-pointer gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-100 focus:bg-slate-100"
                                                    >
                                                        <Edit className="h-3.5 w-3.5 text-slate-500" />
                                                        <span className="text-xs font-bold text-slate-700">Update Progress</span>
                                                    </DropdownMenuItem>

                                                    {item.meetingNumber !== "MANUAL" && (
                                                        <>


                                                            {item.petikanRisalah && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDownloadRisalah(item.petikanRisalah)}
                                                                    className="cursor-pointer gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-100 focus:bg-slate-100"
                                                                >
                                                                    <Download className="h-3.5 w-3.5 text-slate-500" />
                                                                    <span className="text-xs font-bold text-slate-700">Unduh Petikan</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {selectedAgenda && (
                <MonevUpdateDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    agenda={selectedAgenda}
                />
            )}
            <MonevAddDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
            />
        </div>
    )
}

function MonevStatusBadge({ status }: { status: string | null }) {
    if (status === "DONE") {
        return (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20 text-[9px] font-black flex items-center gap-1 w-fit mx-auto">
                <CheckCircle2 className="h-2.5 w-2.5" /> SELESAI
            </Badge>
        )
    }
    return (
        <Badge className="bg-amber-500/10 text-amber-600 border-none hover:bg-amber-500/20 text-[9px] font-black flex items-center gap-1 w-fit mx-auto">
            <Clock className="h-2.5 w-2.5" /> IN PROGRESS
        </Badge>
    )
}