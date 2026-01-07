"use client"

import { useState, useMemo, useEffect } from "react"
import {
    MoreHorizontal,
    Trash2,
    FileEdit,
    Eye,
    Search,
    Calendar as CalendarIcon,
    LayoutGrid,
    List,
    ChevronRight,
    Download,
    X,
    Lock
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"

import { Checkbox } from "@/components/ui/checkbox"
import { DeleteAction } from "./delete-action"
import { DetailAgendaSheet } from "./detail-agenda-sheet"
import { EditAgendaModal } from "./edit-agenda-modal"
import { AddAgendaModal } from "./add-agenda-modal"
import { deleteBulkAgendasAction } from "@/server/actions/agenda-actions"
import { toast } from "sonner"
import Image from "next/image"

// ✅ Export agar dapat di-import dari server component
export interface AgendaRadir {
    id: string
    title: string
    urgency: string | null
    deadline: string | null // gunakan ISO string dari server atau null
    initiator: string | null
    status: string | null
    contactPerson: string | null
}

interface RadirClientProps {
    data: AgendaRadir[]
}

export function RadirClient({ data }: RadirClientProps) {
    // ✅ FIX: Tambahkan state isClient untuk menangani Hydration Mismatch
    const [isClient, setIsClient] = useState(false)
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    })

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedAgenda, setSelectedAgenda] = useState<{ id: string, title: string } | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<AgendaRadir | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [selectedEdit, setSelectedEdit] = useState<AgendaRadir | null>(null)

    // ✅ FIX: useEffect untuk memastikan render hanya terjadi di client setelah mounting
    useEffect(() => {
        const id = setTimeout(() => setIsClient(true), 0)
        return () => clearTimeout(id)
    }, [])

    const handleOpenDetail = (agenda: AgendaRadir) => {
        setSelectedDetail(agenda)
        setDetailOpen(true)
    }

    const handleOpenEdit = (agenda: AgendaRadir) => {
        setSelectedEdit(agenda)
        setEditOpen(true)
    }

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            // safe string handling for nullable fields
            const title = (item.title || "").toLowerCase()
            const initiator = (item.initiator || "").toLowerCase()
            const matchesSearch = title.includes(searchTerm.toLowerCase()) || initiator.includes(searchTerm.toLowerCase())
            const matchesStatus = statusFilter === "all" || (item.status || "").toUpperCase() === statusFilter.toUpperCase()

            let matchesDate = true
            if (dateRange.from && dateRange.to) {
                if (!item.deadline) {
                    matchesDate = false
                } else {
                    const itemDate = new Date(item.deadline)
                    matchesDate = isWithinInterval(itemDate, {
                        start: startOfDay(dateRange.from),
                        end: endOfDay(dateRange.to),
                    })
                }
            }

            return matchesSearch && matchesStatus && matchesDate
        })
    }, [data, searchTerm, statusFilter, dateRange])

    const toggleSelectAll = () => {
        // Hanya izinkan select all untuk data yang TIDAK dikunci jika ingin melakukan bulk delete
        const deletableItems = filteredData.filter(item => item.status !== "DIJADWALKAN" && item.status !== "SELESAI")

        if (selectedIds.length === deletableItems.length && deletableItems.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(deletableItems.map(item => item.id))
        }
    }

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} agenda terpilih?`)) return

        const res = await deleteBulkAgendasAction(selectedIds)
        if (res.success) {
            toast.custom((t) => (
                <div className="flex items-center gap-4 bg-white border-l-4 border-orange-500 p-4 shadow-2xl rounded-lg min-w-87.5">
                    <div className="shrink-0">
                        <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-[#125d72]">Data Massal Dihapus</h4>
                        <p className="text-xs text-slate-500 italic uppercase truncate max-w-50">
                            {selectedIds.length} Agenda Berhasil dibersihkan.
                        </p>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))
            setSelectedIds([])
        } else {
            toast.error(res.error || "Gagal menghapus data")
        }
    }

    // ✅ FIX: Return null jika belum di-render di client (mencegah error hydration)
    if (!isClient) return null

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-col gap-1 border-l-4 border-[#14a2ba] pl-4">
                        <h1 className="text-2xl md:text-3xl font-black text-[#125d72] tracking-tight uppercase">
                            Agenda Radir
                        </h1>
                        <p className="text-slate-500 font-medium">Halaman Manajemen Usulan Rapat Direksi</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-2">
                            <Button variant="destructive" size="sm" className="font-bold shadow-md" onClick={handleBulkDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus ({selectedIds.length})
                            </Button>
                        </div>
                    )}
                    <Button variant="outline" className="hidden md:flex border-slate-200 text-slate-600 font-bold shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Export Data
                    </Button>
                    <AddAgendaModal />
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl border shadow-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2 p-2">
                    <div className="relative flex-1 min-w-75">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari agenda atau unit pemrakarsa..."
                            className="pl-10 h-11 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-[#14a2ba]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-11 justify-start border-slate-200 bg-white font-semibold px-4">
                                <CalendarIcon className="mr-2 h-4 w-4 text-[#14a2ba]" />
                                {dateRange.from ? (
                                    dateRange.to ? (
                                        <span className="text-xs tracking-tighter">
                                            {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                                        </span>
                                    ) : (format(dateRange.from, "dd/MM/yy"))
                                ) : (<span className="text-slate-500">Filter Tanggal</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48 h-11 border-slate-200 font-semibold text-[#125d72] focus:ring-[#14a2ba]">
                            <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="DAPAT_DILANJUTKAN">Dapat Dilanjutkan</SelectItem>
                            <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
                            <SelectItem value="DIJADWALKAN">Dijadwalkan</SelectItem>
                            <SelectItem value="SELESAI">Selesai</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex bg-slate-100 p-1 rounded-lg ml-auto">
                        <Button
                            variant={viewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("table")}
                            className={cn("h-9 w-10 p-0 shadow-none", viewMode === "table" && "shadow-sm bg-white text-[#14a2ba]")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className={cn("h-9 w-10 p-0 shadow-none", viewMode === "grid" && "shadow-sm bg-white text-[#14a2ba]")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {viewMode === "table" ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#f8fafc] border-b">
                            <TableRow>
                                <TableHead className="w-12.5 px-4">
                                    <Checkbox
                                        checked={selectedIds.length === filteredData.filter(i => i.status !== "DIJADWALKAN").length && filteredData.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="w-70 text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest">Agenda Rapat</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest text-center w-10">
                                    <Lock className="h-3 w-3 mx-auto text-slate-300" />
                                </TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest">Urgensi</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest">Deadline</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest">Pemrakarsa</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest text-center">Status</TableHead>
                                <TableHead className="text-right text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((agenda) => {
                                const isLocked = agenda.status === "DIJADWALKAN" || agenda.status === "SELESAI"
                                return (
                                    <TableRow key={agenda.id} className={cn("hover:bg-slate-50/50 group border-b last:border-0", selectedIds.includes(agenda.id) && "bg-blue-50/40", isLocked && "bg-slate-50/30")}>
                                        <TableCell className="px-4">
                                            {!isLocked && (
                                                <Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} />
                                            )}
                                        </TableCell>
                                        <TableCell className="py-5 max-w-70">
                                            <div className="space-y-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <p className="font-bold text-[#125d72] leading-tight line-clamp-2 uppercase text-xs tracking-tight">
                                                            {agenda.title}
                                                        </p>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-80 whitespace-normal text-sm">
                                                        {agenda.title}
                                                    </TooltipContent>
                                                </Tooltip>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter"> : {agenda.contactPerson}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isLocked && <Lock className="h-3 w-3 mx-auto text-amber-500 opacity-60" />}
                                        </TableCell>
                                        {/* ✅ Membatasi Lebar Kolom Urgensi */}
                                        <TableCell className="max-w-30">
                                            <Badge variant="outline" className="font-black text-[10px] rounded-full border-[#14a2ba] text-[#14a2ba] bg-[#14a2ba]/5 uppercase w-full block truncate text-center">
                                                <span className="line-clamp-3 whitespace-normal">
                                                    {agenda.urgency}
                                                </span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                                                <CalendarIcon className="h-3.5 w-3.5 text-[#14a2ba]" />
                                                {agenda.deadline ? format(new Date(agenda.deadline), "dd/MM/yyyy") : "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-bold text-slate-700">{agenda.initiator}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn("text-[10px] font-bold px-3 py-0.5 rounded-full border-none shadow-none uppercase", agenda.status === "Draft" ? "bg-slate-100 text-slate-500" : "bg-[#125d72] text-white")}>
                                                {agenda.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ActionButtons
                                                agenda={agenda}
                                                onSelectDetail={() => handleOpenDetail(agenda)}
                                                onSelectEdit={() => handleOpenEdit(agenda)}
                                                onSelectDelete={(id, title) => {
                                                    setSelectedAgenda({ id, title });
                                                    setDeleteDialogOpen(true);
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((agenda) => {
                        const isLocked = agenda.status === "DIJADWALKAN" || agenda.status === "SELESAI"
                        return (
                            <div key={agenda.id} className={cn("bg-white border-2 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all group relative", selectedIds.includes(agenda.id) ? "border-[#14a2ba] bg-blue-50/20" : "border-transparent", isLocked && "opacity-90")}>
                                <div className="absolute top-4 left-4 z-10">
                                    {!isLocked && <Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} />}
                                    {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                </div>
                                <div className="flex items-center justify-between mb-4 ml-6">
                                    <Badge className="bg-[#125d72] text-[10px] font-bold px-3">{agenda.status}</Badge>
                                    <ActionButtons
                                        agenda={agenda}
                                        onSelectDetail={() => handleOpenDetail(agenda)}
                                        onSelectEdit={() => handleOpenEdit(agenda)}
                                        onSelectDelete={(id, title) => {
                                            setSelectedAgenda({ id, title });
                                            setDeleteDialogOpen(true);
                                        }}
                                    />
                                </div>
                                <h3 className="font-bold text-[#125d72] text-sm uppercase leading-normal h-12 line-clamp-2 mb-6 tracking-tight">
                                    {agenda.title}
                                </h3>
                                <div className="grid grid-cols-2 gap-4 border-t pt-5">
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Deadline</p>
                                        <p className="text-xs font-black text-slate-700 italic">{agenda.deadline ? format(new Date(agenda.deadline), "dd MMM yyyy") : "-"}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Urgensi</p>
                                        <p className="text-xs font-black text-[#14a2ba] uppercase line-clamp-1" title={agenda.urgency || ""}>{agenda.urgency}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleOpenDetail(agenda)}
                                    className="w-full mt-6 bg-slate-50 text-[#125d72] font-black text-[11px] uppercase tracking-widest hover:bg-[#14a2ba] hover:text-white transition-colors py-6 rounded-xl group-hover:shadow-lg"
                                >
                                    Lihat Detail Usulan <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}

            {selectedAgenda && (
                <DeleteAction
                    id={selectedAgenda.id}
                    title={selectedAgenda.title}
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                />
            )}
            <DetailAgendaSheet
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                agenda={selectedDetail as any}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
            {selectedEdit && (
                <EditAgendaModal
                    key={selectedEdit.id}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    agenda={selectedEdit as any}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}
        </div>
    )
}

function ActionButtons({ agenda, onSelectDelete, onSelectDetail, onSelectEdit }: { agenda: AgendaRadir, onSelectDelete: (id: string, title: string) => void, onSelectDetail?: () => void, onSelectEdit?: () => void }) {
    const isLocked = agenda.status === "DIJADWALKAN" || agenda.status === "SELESAI"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-none shadow-2xl">
                <DropdownMenuItem onClick={onSelectDetail} className="py-3 rounded-lg font-bold text-slate-600 cursor-pointer">
                    <Eye className="mr-3 h-4 w-4 text-blue-500" /> Detail Agenda
                </DropdownMenuItem>

                {!isLocked && (
                    <>
                        <DropdownMenuItem onClick={onSelectEdit} className="py-3 rounded-lg font-bold text-slate-600 cursor-pointer">
                            <FileEdit className="mr-3 h-4 w-4 text-[#14a2ba]" /> Ubah Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem
                            className="py-3 rounded-lg font-bold text-red-600 focus:bg-red-50 focus:text-red-600"
                            onSelect={(e) => {
                                e.preventDefault();
                                onSelectDelete(agenda.id, agenda.title);
                            }}
                        >
                            <Trash2 className="mr-3 h-4 w-4" /> Hapus Agenda
                        </DropdownMenuItem>
                    </>
                )}

                {isLocked && (
                    <div className="px-3 py-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg flex items-center gap-2 mt-2">
                        <Lock className="h-3 w-3" /> Agenda Terkunci (Dijadwalkan)
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}