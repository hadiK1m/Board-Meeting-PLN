/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
    Search, Filter, MoreHorizontal, Edit, Download, ExternalLink, CheckCircle2, Clock, LayoutGrid, List, Calendar, Plus, Paperclip, ArrowRight, Target, Phone
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ✅ Import Khusus Rakordir
import { MonevAddRakordirDialog } from "./monev-add-rakordir-dialog"
import { MonevUpdateRakordirDialog } from "./monev-update-rakordir-dialog"
import { getEvidenceUrlAction } from "@/server/actions/monev-rakordir-actions"
import { getRisalahDownloadUrlAction } from "@/server/actions/radir-actions" // Reuse

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
    monevStatus: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meetingDecisions: DecisionItem[] | any
}

interface MonevRakordirClientProps {
    initialData: MonevItem[]
}

export function MonevRakordirClient({ initialData }: MonevRakordirClientProps) {
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
        if (!path) return toast.error("File risalah belum tersedia.")
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
                    Monitoring & Evaluasi Rakordir
                </h1>
                <p className="text-slate-500 font-medium text-sm italic">
                    Pemantauan dan evaluasi pelaksanaan arahan hasil rapat koordinasi direksi
                </p>
            </div>

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
                        <SelectTrigger className="h-10 w-25 rounded-xl border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white transition-all"><Calendar className="mr-2 h-3.5 w-3.5 text-slate-500" /><SelectValue placeholder="Tahun" /></SelectTrigger>
                        <SelectContent><SelectItem value="ALL">Semua</SelectItem>{uniqueYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(v: "ALL" | "ON_PROGRESS" | "DONE") => setStatusFilter(v)}>
                        <SelectTrigger className="h-10 w-30 rounded-xl border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white transition-all"><Filter className="mr-2 h-3.5 w-3.5 text-slate-500" /><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent><SelectItem value="ALL">Semua</SelectItem><SelectItem value="ON_PROGRESS">In Progress</SelectItem><SelectItem value="DONE">Selesai</SelectItem></SelectContent>
                    </Select>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 h-10">
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${viewMode === "grid" ? "bg-white shadow-sm text-[#125d72]" : "text-slate-400 hover:text-slate-600"}`} onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${viewMode === "table" ? "bg-white shadow-sm text-[#125d72]" : "text-slate-400 hover:text-slate-600"}`} onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Search className="h-8 w-8 text-slate-300" /></div>
                    <h3 className="text-slate-900 font-bold text-lg">Data tidak ditemukan</h3>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredData.map((item) => (
                        <Card key={item.id} className="rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group/card">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge className="bg-[#125d72]/10 text-[#125d72] border-none text-[10px] font-black uppercase">#{item.meetingNumber ?? "-"}</Badge>
                                    <MonevStatusBadge status={item.monevStatus} />
                                </div>
                                <h3 className="font-bold text-slate-800 leading-snug mb-3 line-clamp-2 min-h-10" title={item.title}>{item.title}</h3>
                                <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-2">
                                    {(() => {
                                        const decision = Array.isArray(item.meetingDecisions) ? item.meetingDecisions[0] : null
                                        return decision ? (
                                            <>
                                                <div className="flex items-start gap-2 text-xs"><Target className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" /><span className="text-slate-600 font-medium line-clamp-1">{decision.targetOutput || "Output belum diisi"}</span></div>
                                                <div className="flex items-start gap-2 text-xs"><ArrowRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" /><span className="text-slate-600 line-clamp-1">{decision.currentProgress || "Belum ada progress"}</span></div>
                                            </>
                                        ) : <span className="text-xs text-slate-400 italic">Belum ada detail arahan</span>
                                    })()}
                                </div>
                                <Button className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#125d72] h-10 rounded-xl text-[10px] font-bold uppercase tracking-wider" onClick={() => openUpdateDialog(item)}><Edit className="mr-2 h-3.5 w-3.5" /> Update Detail</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[30%] text-[10px] font-black uppercase text-slate-500">Pemrakarsa & Agenda</TableHead>
                                <TableHead className="w-[20%] text-[10px] font-black uppercase text-slate-500">Narahubung</TableHead>
                                {/* KOLOM RISALAH TTD DIHAPUS */}
                                <TableHead className="w-[30%] text-[10px] font-black uppercase text-slate-500">Detail Arahan</TableHead>
                                {/* KOLOM EVIDENCE DIHAPUS */}
                                <TableHead className="w-[10%] text-[10px] font-black uppercase text-slate-500 text-center">Status Monev</TableHead>
                                <TableHead className="w-[10%] text-[10px] font-black uppercase text-slate-500 text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((item) => {
                                const decisions = Array.isArray(item.meetingDecisions) ? (item.meetingDecisions as DecisionItem[]) : []
                                const firstDecision = decisions[0]
                                const doneCount = decisions.filter((d: DecisionItem) => d.status === "DONE").length
                                const decisionCount = decisions.length

                                return (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="align-top py-4">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[9px] font-black border-slate-300 text-slate-500">#{item.meetingNumber ?? "-"}</Badge>
                                                    <span className="text-[10px] font-medium text-slate-400">{item.executionDate ? format(new Date(item.executionDate), "dd MMM yyyy", { locale: id }) : "-"}</span>
                                                </div>
                                                <p className="font-bold text-sm text-[#125d72] line-clamp-2 leading-snug" title={item.title}>{item.title}</p>
                                                <div className="inline-block bg-[#125d72]/5 text-[#125d72] text-[10px] font-bold px-2 py-0.5 rounded">{item.initiator || "Tanpa Pemrakarsa"}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top py-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-700">{item.contactPerson || "-"}</p>
                                                <p className="text-[10px] text-slate-500">{item.position || "-"}</p>
                                                {item.phone && <a href={`https://wa.me/${item.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mt-1 hover:bg-emerald-100 transition-colors border border-emerald-100"><Phone className="h-2.5 w-2.5" /> Chat WA</a>}
                                            </div>
                                        </TableCell>

                                        {/* KOLOM RISALAH TTD DIHAPUS DARI SINI */}

                                        <TableCell className="align-top py-4">
                                            {firstDecision ? (
                                                <div className="space-y-3">
                                                    <div><div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1"><Target className="h-3 w-3" /> Target Output</div><p className="text-xs font-medium text-slate-800 leading-relaxed">{firstDecision.targetOutput || <span className="text-slate-400 italic">Belum diisi...</span>}</p></div>
                                                    <div className="pl-2 border-l-2 border-slate-200"><div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1"><ArrowRight className="h-3 w-3" /> Progress Terkini</div><p className="text-xs text-slate-600">{firstDecision.currentProgress || <span className="text-slate-400 italic">Belum update...</span>}</p></div>
                                                    {decisionCount > 1 && <div className="text-[10px] text-slate-400 italic pt-1">+{decisionCount - 1} butir arahan lainnya...</div>}
                                                </div>
                                            ) : <span className="text-xs text-slate-400 italic">Data arahan kosong</span>}
                                        </TableCell>

                                        {/* KOLOM EVIDENCE DIHAPUS DARI SINI */}

                                        <TableCell className="align-top py-4 text-center">
                                            <MonevStatusBadge status={item.monevStatus} />
                                            <div className="mt-2 text-[10px] text-slate-400 font-medium">{doneCount} / {decisionCount} Item Selesai</div>
                                        </TableCell>
                                        <TableCell className="align-top py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#125d72]"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-100">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400">Aksi Monev</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => openUpdateDialog(item)} className="cursor-pointer gap-2 py-2.5"><Edit className="h-3.5 w-3.5 text-slate-500" /><span className="text-xs font-bold text-slate-700">Update Progress</span></DropdownMenuItem>
                                                    {item.meetingNumber !== "MANUAL" && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => window.open(`/pelaksanaan-rapat/rakordir/live?number=${item.meetingNumber}&year=${item.meetingYear}`, '_blank')} className="cursor-pointer gap-2 py-2.5"><ExternalLink className="h-3.5 w-3.5 text-slate-500" /><span className="text-xs font-bold text-slate-700">Lihat Notulensi</span></DropdownMenuItem>
                                                            {item.risalahTtd && <DropdownMenuItem onClick={() => handleDownloadRisalah(item.risalahTtd)} className="cursor-pointer gap-2 py-2.5"><Download className="h-3.5 w-3.5 text-slate-500" /><span className="text-xs font-bold text-slate-700">Download Risalah</span></DropdownMenuItem>}
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

            {selectedAgenda && <MonevUpdateRakordirDialog open={dialogOpen} onOpenChange={setDialogOpen} agenda={selectedAgenda} />}
            <MonevAddRakordirDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
        </div>
    )
}

function MonevStatusBadge({ status }: { status: string | null }) {
    if (status === "DONE") return <Badge className="bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20 text-[9px] font-black flex items-center gap-1 w-fit mx-auto"><CheckCircle2 className="h-2.5 w-2.5" /> SELESAI</Badge>
    return <Badge className="bg-amber-500/10 text-amber-600 border-none hover:bg-amber-500/20 text-[9px] font-black flex items-center gap-1 w-fit mx-auto"><Clock className="h-2.5 w-2.5" /> IN PROGRESS</Badge>
}