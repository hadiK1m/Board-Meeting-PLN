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
    Lock,
    User,
    Building2,
    X,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import Image from "next/image"
import * as XLSX from "xlsx"

import { Agenda } from "@/db/schema/agendas"
import { deleteKepdirAction } from "@/server/actions/kepdir-actions"
import { deleteBulkAgendasAction } from "@/server/actions/agenda-actions"
import { DetailKepdirSheet } from "./detail-kepdir-sheet"
import { EditKepdirModal } from "./edit-kepdir-modal"
import { AddKepdirModal } from "./add-kepdir-modal"
import { Checkbox } from "@/components/ui/checkbox"

// ✅ Type safety tanpa 'any'
interface KepdirClientProps {
    initialData: Agenda[]
}

export function KepdirClient({ initialData = [] }: KepdirClientProps) {
    const [mounted, setMounted] = useState(false)
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    })

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<Agenda | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [selectedEdit, setSelectedEdit] = useState<Agenda | null>(null)

    useEffect(() => {
        const rafId = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(rafId);
    }, [])

    const filteredData = useMemo(() => {
        return initialData.filter((item) => {
            const title = (item.title || "").toLowerCase()
            const pic = (item.contactPerson || "").toLowerCase()
            const initiator = (item.initiator || "").toLowerCase()

            const matchesSearch = title.includes(searchTerm.toLowerCase()) ||
                pic.includes(searchTerm.toLowerCase()) ||
                initiator.includes(searchTerm.toLowerCase())

            const matchesStatus = statusFilter === "all" || (item.status || "").toUpperCase() === statusFilter.toUpperCase()

            let matchesDate = true
            if (dateRange.from && dateRange.to && item.createdAt) {
                const itemDate = new Date(item.createdAt)
                matchesDate = isWithinInterval(itemDate, {
                    start: startOfDay(dateRange.from),
                    end: endOfDay(dateRange.to),
                })
            }
            return matchesSearch && matchesStatus && matchesDate
        })
    }, [initialData, searchTerm, statusFilter, dateRange])

    // ✅ LOGIKA BULK ACTION
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

    const hasLockedItemInSelection = useMemo(() => {
        const selectedItems = initialData.filter(item => selectedIds.includes(item.id));
        return selectedItems.some(item => item.status === "DIJADWALKAN" || item.status === "SELESAI");
    }, [selectedIds, initialData]);

    const handleExport = () => {
        if (selectedIds.length === 0) return;
        const selectedData = initialData.filter(item => selectedIds.includes(item.id));

        const excelData = selectedData.map((item, index) => ({
            No: index + 1,
            "Judul Agenda": item.title,
            Prioritas: item.priority || "Low",
            Urgensi: item.urgency || "-",
            Pemrakarsa: item.initiator || "-",
            Narahubung: item.contactPerson || "-",
            WhatsApp: item.phone || "-",
            Status: item.status || "DRAFT",
            "Tanggal Dibuat": item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy") : "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Agenda Kepdir");
        XLSX.writeFile(workbook, `Export_Kepdir_${format(new Date(), "ddMMyy_HHmm")}.xlsx`);
        toast.success(`${selectedIds.length} data berhasil diekspor.`);
    }

    const handleBulkDelete = async () => {
        if (hasLockedItemInSelection) {
            toast.error("Proteksi: Beberapa agenda terpilih sudah dijadwalkan/selesai.");
            return;
        }
        if (!confirm(`Hapus ${selectedIds.length} data Kepdir terpilih?`)) return
        const res = await deleteBulkAgendasAction(selectedIds)
        if (res.success) {
            toast.custom((t) => (
                <div className="flex items-center gap-4 bg-white border-l-4 border-orange-500 p-4 shadow-2xl rounded-lg">
                    <Image src="/logo-pln.png" alt="PLN" width={35} height={35} />
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-[#125d72]">Bulk Delete Berhasil</h4>
                        <p className="text-xs text-slate-500">{selectedIds.length} agenda telah dihapus.</p>
                    </div>
                    <button onClick={() => toast.dismiss(t)}><X className="h-4 w-4 text-slate-300" /></button>
                </div>
            ))
            setSelectedIds([])
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus agenda kepdir ini?")) return
        const res = await deleteKepdirAction(id)
        if (res.success) {
            toast.success("Agenda Berhasil Dihapus")
        } else {
            toast.error(res.error)
        }
    }

    if (!mounted) return null

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-col gap-1 border-l-4 border-[#14a2ba] pl-4">
                        <h1 className="text-2xl md:text-3xl font-black text-[#125d72] tracking-tight uppercase">
                            Kepdir Sirkuler
                        </h1>
                        <p className="text-slate-500 font-medium italic text-sm">Manajemen Usulan Keputusan Direksi</p>
                    </div>
                </div>

                {/* ✅ DYNAMIC ACTION BUTTONS */}
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 transition-all">
                            {!hasLockedItemInSelection && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    className="font-bold shadow-md h-11 px-5 rounded-xl uppercase text-[10px]"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus ({selectedIds.length})
                                </Button>
                            )}

                            {hasLockedItemInSelection && (
                                <div className="flex items-center bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg gap-2 mr-2">
                                    <Lock className="h-3 w-3 text-amber-600" />
                                    <span className="text-[9px] font-bold text-amber-700 uppercase leading-none">Hapus dikunci (Ada agenda terjadwal)</span>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                onClick={handleExport}
                                className="border-[#14a2ba] text-[#14a2ba] hover:bg-[#14a2ba] hover:text-white font-bold shadow-sm h-11 px-5 rounded-xl uppercase text-[10px]"
                            >
                                <Download className="mr-2 h-4 w-4" /> Export ({selectedIds.length})
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds([])}
                                className="text-slate-400 hover:text-red-500"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <AddKepdirModal />
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-2 rounded-xl border shadow-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2 p-2">
                    <div className="relative flex-1 min-w-75">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari judul, pengusul, atau narahubung..."
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
                                ) : (<span className="text-slate-500 text-xs">Filter Tanggal</span>)}
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
                        <SelectTrigger className="w-48 h-11 border-slate-200 font-semibold text-[#125d72]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
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

            {/* Table View */}
            {viewMode === "table" ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#f8fafc] border-b">
                            <TableRow>
                                <TableHead className="w-12 px-4 text-center">
                                    <Checkbox checked={selectedIds.length === filteredData.length && filteredData.length > 0} onCheckedChange={toggleSelectAll} />
                                </TableHead>
                                <TableHead className="w-80 text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest px-6">Agenda Kepdir</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest text-center w-10"><Lock className="h-3 w-3 mx-auto text-slate-300" /></TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest">Direktur Pemrakarsa</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest text-center">Narahubung</TableHead>
                                <TableHead className="text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest text-center">Status</TableHead>
                                <TableHead className="text-right text-[#125d72] font-extrabold uppercase text-[11px] tracking-widest px-6">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((item) => {
                                const isLocked = item.status === "DIJADWALKAN" || item.status === "SELESAI";
                                return (
                                    <TableRow key={item.id} className={cn("hover:bg-slate-50/50 group border-b last:border-0", selectedIds.includes(item.id) && "bg-blue-50/40")}>
                                        <TableCell className="px-4 text-center">
                                            <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelectOne(item.id)} />
                                        </TableCell>
                                        <TableCell className="py-5 px-6 max-w-80">
                                            <div className="space-y-1">
                                                <p className="font-bold text-[#125d72] leading-tight uppercase text-xs tracking-tight line-clamp-2 italic">
                                                    {item.title}
                                                </p>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase flex items-center gap-1">
                                                    <CalendarIcon className="h-3 w-3" /> Dibuat: {item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy") : "-"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{isLocked && <Lock className="h-3 w-3 mx-auto text-amber-500 opacity-60" />}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Badge variant="outline" className="text-[9px] border-[#14a2ba] text-[#14a2ba] bg-[#14a2ba]/5 font-black uppercase">
                                                    {item.director}
                                                </Badge>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">{item.initiator}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-center justify-center text-center gap-1">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{item.contactPerson}</span>
                                                <span className="text-[9px] text-slate-400 font-bold">{item.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn("text-[10px] font-bold px-3 py-0.5 rounded-full uppercase border-none shadow-none", item.status === "SELESAI" ? "bg-[#125d72] text-white" : "bg-slate-100 text-slate-500")}>
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <ActionButtons
                                                item={item}
                                                onDetail={() => { setSelectedDetail(item); setDetailOpen(true); }}
                                                onEdit={() => { setSelectedEdit(item); setEditOpen(true); }}
                                                onDelete={() => handleDelete(item.id)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((item) => {
                        const isLocked = item.status === "DIJADWALKAN" || item.status === "SELESAI";
                        return (
                            <div key={item.id} className={cn("bg-white border-2 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all group relative hover:border-[#14a2ba]", selectedIds.includes(item.id) ? "border-[#14a2ba] bg-blue-50/20" : "border-transparent")}>
                                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                                    <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelectOne(item.id)} />
                                    {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                </div>
                                <div className="flex items-center justify-between mb-4 ml-6">
                                    <Badge className="bg-[#125d72] text-[10px] font-bold px-3 uppercase tracking-widest">{item.status}</Badge>
                                    <ActionButtons
                                        item={item}
                                        onDetail={() => { setSelectedDetail(item); setDetailOpen(true); }}
                                        onEdit={() => { setSelectedEdit(item); setEditOpen(true); }}
                                        onDelete={() => handleDelete(item.id)}
                                    />
                                </div>
                                <h3 className="font-bold text-[#125d72] text-sm uppercase leading-normal h-12 line-clamp-2 mb-6 tracking-tight italic">
                                    {item.title}
                                </h3>

                                <div className="space-y-3 border-t pt-5">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-[#14a2ba]" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase truncate">{item.initiator}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-[#14a2ba]" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase">{item.contactPerson}</span>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    onClick={() => { setSelectedDetail(item); setDetailOpen(true); }}
                                    className="w-full mt-6 bg-slate-50 text-[#125d72] font-black text-[11px] uppercase tracking-widest hover:bg-[#14a2ba] hover:text-white transition-colors py-6 rounded-xl group-hover:shadow-lg"
                                >
                                    Lihat Detail Usulan <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedDetail && (
                <DetailKepdirSheet
                    isOpen={detailOpen}
                    onOpenChange={setDetailOpen}
                    data={{
                        ...selectedDetail,
                        // Mengonversi tipe unknown dari DB ke tipe yang diharapkan komponen secara aman
                        supportingDocuments: selectedDetail.supportingDocuments as string | string[] | null,

                        // ✅ PERBAIKAN: Gunakan casting ke 'Record<string, unknown>' 
                        // alih-alih 'any' untuk mengakses properti yang tidak terdefinisi di tipe dasar
                        notRequiredFiles: (selectedDetail as Record<string, unknown>).notRequiredFiles as string | string[] | null
                    }}
                />
            )}
            {selectedEdit && (
                <EditKepdirModal
                    isOpen={editOpen}
                    onOpenChange={setEditOpen}
                    data={selectedEdit}
                />
            )}
        </div>
    )
}

function ActionButtons({ item, onDetail, onEdit, onDelete }: { item: Agenda, onDetail: () => void, onEdit: () => void, onDelete: () => void }) {
    const isLocked = item.status === "DIJADWALKAN" || item.status === "SELESAI"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-none shadow-2xl">
                <DropdownMenuItem onClick={onDetail} className="py-3 rounded-lg font-bold text-slate-600 cursor-pointer">
                    <Eye className="mr-3 h-4 w-4 text-blue-500" /> Detail Kepdir
                </DropdownMenuItem>
                {!isLocked && (
                    <>
                        <DropdownMenuItem onClick={onEdit} className="py-3 rounded-lg font-bold text-slate-600 cursor-pointer">
                            <FileEdit className="mr-3 h-4 w-4 text-[#14a2ba]" /> Ubah Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem
                            className="py-3 rounded-lg font-bold text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                            onClick={onDelete}
                        >
                            <Trash2 className="mr-3 h-4 w-4" /> Hapus Agenda
                        </DropdownMenuItem>
                    </>
                )}
                {isLocked && (
                    <div className="px-3 py-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg flex items-center gap-2 mt-2 font-bold uppercase tracking-tighter">
                        <Lock className="h-3 w-3" /> Agenda Terkunci
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}