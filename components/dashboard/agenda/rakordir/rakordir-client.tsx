"use client"

import { useState, useMemo, useEffect } from "react"
import {
    MoreHorizontal,
    Trash2,
    Eye,
    Search,
    Calendar as CalendarIcon,
    LayoutGrid,
    List,
    ChevronRight,
    Download,
    X,
    Lock,
    FileJson,
    FileEdit
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
// ✅ Import komponen Alert Dialog
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"

import { Checkbox } from "@/components/ui/checkbox"
import { DetailAgendaSheet } from "./detail-agenda-sheet"
import { AddRakordirDialog } from "./add-agenda-dialog"
import { EditRakordirModal } from "./edit-agenda-modal"
import { deleteRakordirAction } from "@/server/actions/rakordir-actions"
import { toast } from "sonner"
import Image from "next/image"
import { deleteBulkAgendasAction } from "@/server/actions/agenda-actions"

export interface RakordirAgenda {
    id: string
    title: string
    urgency: string | null
    deadline: string | null
    initiator: string | null
    status: string | null
    contactPerson: string | null
}

interface RakordirClientProps {
    initialData: RakordirAgenda[]
}

export function RakordirClient({ initialData }: RakordirClientProps) {
    const [isClient, setIsClient] = useState(false)
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    })

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<RakordirAgenda | null>(null)

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false)
    const [selectedEdit, setSelectedEdit] = useState<RakordirAgenda | null>(null)

    // ✅ Delete Single Item State
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null)
    const [isPending, setIsPending] = useState(false)

    useEffect(() => {
        const id = setTimeout(() => setIsClient(true), 0)
        return () => clearTimeout(id)
    }, [])

    const handleOpenDetail = (agenda: RakordirAgenda) => {
        setSelectedDetail(agenda)
        setDetailOpen(true)
    }

    const handleOpenEdit = (agenda: RakordirAgenda) => {
        console.log("[DEBUG-CLIENT] Opening Edit for ID:", agenda.id)
        setSelectedEdit(agenda)
        setEditOpen(true)
    }

    // ✅ Handler untuk Hapus Single Agenda
    async function handleDelete() {
        if (!selectedDeleteId) return;
        setIsPending(true);

        try {
            const result = await deleteRakordirAction(selectedDeleteId);
            if (result.success) {
                toast.success("Agenda berhasil dihapus");
                setDeleteOpen(false);
            } else {
                toast.error(result.error || "Gagal menghapus agenda");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setIsPending(false);
            setSelectedDeleteId(null);
        }
    }

    const filteredData = useMemo(() => {
        return initialData.filter((item) => {
            const itemDate = item.deadline ? new Date(item.deadline) : null
            const title = item.title || ""
            const initiator = item.initiator || ""

            const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                initiator.toLowerCase().includes(searchTerm.toLowerCase())

            const itemStatus = item.status || "DRAFT"
            const matchesStatus = statusFilter === "all" || itemStatus.toUpperCase() === statusFilter.toUpperCase()

            let matchesDate = true
            if (dateRange.from && dateRange.to && itemDate) {
                matchesDate = isWithinInterval(itemDate, {
                    start: startOfDay(dateRange.from),
                    end: endOfDay(dateRange.to),
                })
            }
            return matchesSearch && matchesStatus && matchesDate
        })
    }, [initialData, searchTerm, statusFilter, dateRange])

    const toggleSelectAll = () => {
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
        if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} agenda Rakordir terpilih?`)) return

        const res = await deleteBulkAgendasAction(selectedIds)
        if (res.success) {
            toast.custom((t) => (
                <div className="flex items-center gap-4 bg-white border-l-4 border-orange-500 p-4 shadow-2xl rounded-lg min-w-87.5">
                    <div className="shrink-0">
                        <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-[#125d72]">Data Rakordir Dihapus</h4>
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

    if (!isClient) return null

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-col gap-1 border-l-4 border-[#14a2ba] pl-4">
                        <h1 className="text-2xl md:text-3xl font-black text-[#125d72] tracking-tight uppercase">
                            Agenda Rakordir
                        </h1>
                        <p className="text-slate-500 font-medium">Manajemen Usulan Rapat Koordinasi Direksi</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <Button variant="destructive" size="sm" className="font-bold shadow-md animate-in fade-in zoom-in" onClick={handleBulkDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus ({selectedIds.length})
                        </Button>
                    )}
                    <Button variant="outline" className="hidden md:flex border-slate-200 text-slate-600 font-bold shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Export Data
                    </Button>
                    <AddRakordirDialog />
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl border shadow-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2 p-2">
                    <div className="relative flex-1 min-w-75">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari agenda rakordir..."
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
                        <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")} className={cn("h-9 w-10 p-0 shadow-none", viewMode === "table" && "shadow-sm bg-white text-[#14a2ba]")}>
                            <List className="h-4 w-4" />
                        </Button>
                        <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className={cn("h-9 w-10 p-0 shadow-none", viewMode === "grid" && "shadow-sm bg-white text-[#14a2ba]")}>
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
                                <TableHead className="w-12.5 px-4 text-center">
                                    <Checkbox checked={selectedIds.length === filteredData.filter(i => i.status !== "DIJADWALKAN" && i.status !== "SELESAI").length && filteredData.length > 0} onCheckedChange={toggleSelectAll} />
                                </TableHead>
                                <TableHead className="w-70 text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest">Agenda Rakordir</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest text-center w-10"><Lock className="h-3 w-3 mx-auto text-slate-300" /></TableHead>
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
                                        <TableCell className="px-4 text-center">
                                            {!isLocked && <Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} />}
                                        </TableCell>
                                        <TableCell className="py-5 max-w-70">
                                            <div className="space-y-1">
                                                <p className="font-bold text-[#125d72] leading-tight line-clamp-2 uppercase text-xs italic">{agenda.title}</p>
                                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 uppercase"><FileJson className="h-3 w-3" /> {agenda.contactPerson || "No PIC"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{isLocked && <Lock className="h-3 w-3 mx-auto text-amber-500 opacity-60" />}</TableCell>
                                        <TableCell className="max-w-[110px]">
                                            <Badge variant="outline" className="font-black text-[10px] rounded-full border-[#14a2ba] text-[#14a2ba] bg-[#14a2ba]/5 uppercase w-full block truncate text-center rounded-2xl">
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
                                        <TableCell className="py-5 max-w-70">
                                            <div className="space-y-1">
                                                <p className="font-bold text-[#125d72] leading-tight line-clamp-2 uppercase text-xs italic">{agenda.initiator}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn("text-[10px] font-bold px-3 py-0.5 rounded-full border-none shadow-none uppercase", agenda.status === "DRAFT" ? "bg-slate-100 text-slate-500" : "bg-[#125d72] text-white")}>
                                                {agenda.status?.replace(/_/g, " ") || "DRAFT"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ActionButtons
                                                onSelectDetail={() => handleOpenDetail(agenda)}
                                                onSelectEdit={() => handleOpenEdit(agenda)}
                                                // ✅ Trigger Dialog Hapus
                                                onSelectDelete={() => { setSelectedDeleteId(agenda.id); setDeleteOpen(true); }}
                                                status={agenda.status}
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
                            <div key={agenda.id} className={cn("bg-white border-2 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all group relative", selectedIds.includes(agenda.id) ? "border-[#14a2ba] bg-blue-50/20" : "border-transparent")}>
                                <div className="absolute top-4 left-4 z-10">
                                    {!isLocked && <Checkbox checked={selectedIds.includes(agenda.id)} onCheckedChange={() => toggleSelectOne(agenda.id)} />}
                                    {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                </div>
                                <div className="flex items-center justify-between mb-4 ml-6">
                                    <Badge className="bg-[#125d72] text-[10px] font-bold px-3">{agenda.status || "DRAFT"}</Badge>
                                    <ActionButtons
                                        onSelectDetail={() => handleOpenDetail(agenda)}
                                        onSelectEdit={() => handleOpenEdit(agenda)}
                                        // ✅ Trigger Dialog Hapus
                                        onSelectDelete={() => { setSelectedDeleteId(agenda.id); setDeleteOpen(true); }}
                                        status={agenda.status}
                                    />
                                </div>
                                <h3 className="font-bold text-[#125d72] text-sm uppercase leading-normal h-12 line-clamp-2 mb-6 tracking-tight italic">{agenda.title}</h3>
                                <div className="grid grid-cols-2 gap-4 border-t pt-5">
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Deadline</p>
                                        <p className="text-xs font-black text-slate-700 italic">
                                            {agenda.deadline ? format(new Date(agenda.deadline), "dd MMM yyyy") : "-"}
                                        </p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Urgensi</p>
                                        <p className="text-xs font-black text-[#14a2ba] uppercase">{agenda.urgency || "NORMAL"}</p>
                                    </div>
                                </div>
                                <Button onClick={() => handleOpenDetail(agenda)} className="w-full mt-6 bg-slate-50 text-[#125d72] font-black text-[11px] uppercase tracking-widest hover:bg-[#14a2ba] hover:text-white transition-colors py-6 rounded-xl">
                                    Lihat Detail Rakordir <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}

            <DetailAgendaSheet agenda={selectedDetail} open={detailOpen} onOpenChange={setDetailOpen} />

            {selectedEdit && (
                <EditRakordirModal
                    key={selectedEdit.id}
                    agenda={selectedEdit}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}

            {/* ✅ AlertDialog untuk Konfirmasi Hapus */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus agenda secara permanen beserta seluruh lampiran file yang terkait.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={isPending}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isPending ? "Menghapus..." : "Ya, Hapus Agenda"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ✅ Update Interface Props ActionButtons
function ActionButtons({
    onSelectDetail,
    onSelectEdit,
    onSelectDelete,
    status
}: {
    onSelectDetail?: () => void,
    onSelectEdit?: () => void,
    onSelectDelete?: () => void,
    status?: string | null
}) {
    const isLocked = status === "DIJADWALKAN" || status === "SELESAI"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-none shadow-2xl">
                <DropdownMenuItem onClick={onSelectDetail} className="py-3 rounded-lg font-bold text-slate-600 cursor-pointer">
                    <Eye className="mr-3 h-4 w-4 text-blue-500" /> Detail Agenda Rakordir
                </DropdownMenuItem>

                {!isLocked && onSelectEdit && (
                    <DropdownMenuItem onClick={onSelectEdit} className="py-3 rounded-lg font-bold text-slate-600 cursor-pointer">
                        <FileEdit className="mr-3 h-4 w-4 text-[#14a2ba]" /> Ubah Data
                    </DropdownMenuItem>
                )}

                {/* ✅ Menu Hapus */}
                {!isLocked && onSelectDelete && (
                    <DropdownMenuItem
                        onClick={onSelectDelete}
                        className="py-3 rounded-lg font-bold cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                        <Trash2 className="mr-3 h-4 w-4 text-red-500" /> Hapus Agenda
                    </DropdownMenuItem>
                )}

                {isLocked && (
                    <div className="px-3 py-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg flex items-center gap-2 mt-2">
                        <Lock className="h-3 w-3" /> Agenda Terkunci
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}