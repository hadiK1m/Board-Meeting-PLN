/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Search,
    Calendar,
    MapPin,
    MoreHorizontal,
    FileText,
    Settings2,
    CheckCircle2,
    Clock,
    Hash,
    FileUp,
    FileDown,
    Trash2,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { exportRakordirToDocx } from "@/server/actions/export-actions"
import { deleteFinalMinutesAction, getSignedFileUrl } from "@/server/actions/agenda-actions"
import { cn } from "@/lib/utils"
import { UploadNotulensiDialog } from "./upload-notulensi-dialog"

interface RakordirListViewProps {
    initialData: any[] // grouped meetings
    viewMode: "table" | "grid"
}

export function RakordirListView({ initialData, viewMode }: RakordirListViewProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    // ✅ State untuk Dialog Upload
    const [uploadOpen, setUploadOpen] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<any>(null)

    const filteredData = initialData.filter((item) => {
        const searchStr = `${item.meetingNumber} ${item.location} ${item.meetingYear}`.toLowerCase()
        return searchStr.includes(searchTerm.toLowerCase())
    })

    const handleOpenUpload = (group: any) => {
        // Kita parsing data group agar sesuai dengan interface agenda di dialog
        // Menggunakan agenda pertama sebagai representasi atau membuat objek virtual
        setSelectedGroup({
            id: group.agendas[0]?.id, // Mengambil ID dari agenda pertama dalam grup
            title: `Rakordir #${group.meetingNumber} / ${group.meetingYear}`
        })
        setUploadOpen(true)
    }

    const handleExportRakordir = async (meetingNumber: string, meetingYear: string) => {
        setIsExporting(true)
        const toastId = toast.loading("Sedang menyiapkan notulensi Rakordir...")

        try {
            const result = await exportRakordirToDocx(meetingNumber, meetingYear)

            if (result.success && result.data) {
                const link = document.createElement("a")
                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.data}`
                link.download = result.filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success("Notulensi berhasil diunduh", { id: toastId })
            } else {
                toast.error(result.error || "Gagal membuat dokumen", { id: toastId })
            }
        } catch (error) {
            console.error("Export Error:", error)
            toast.error("Terjadi kesalahan sistem saat mengunduh", { id: toastId })
        } finally {
            setIsExporting(false)
        }
    }

    if (viewMode === "grid") {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {filteredData.map((group) => (
                    <div
                        key={group.groupKey}
                        className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText size={80} className="text-[#125d72]" />
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <Badge className="bg-[#125d72]/10 text-[#125d72] border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
                                    #{group.meetingNumber} / {group.meetingYear}
                                </Badge>
                                <h3 className="text-sm font-black text-slate-800 uppercase leading-tight mt-2">
                                    {group.agendas.length} Materi Agenda
                                </h3>
                            </div>
                            <StatusBadge status={group.status} />
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Calendar className="h-3.5 w-3.5 text-[#14a2ba]" />
                                <span className="text-[11px] font-bold uppercase tracking-tight">
                                    {group.executionDate
                                        ? format(new Date(group.executionDate), "EEEE, dd MMM yyyy", { locale: id })
                                        : "TBD"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <MapPin className="h-3.5 w-3.5 text-[#14a2ba]" />
                                <span className="text-[11px] font-bold uppercase tracking-tight truncate">
                                    {group.location || "Lokasi belum diatur"}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() =>
                                    router.push(
                                        `/pelaksanaan-rapat/rakordir/live?number=${group.meetingNumber}&year=${group.meetingYear}`
                                    )
                                }
                                className="flex-1 bg-[#125d72] hover:bg-[#0e4b5d] text-white rounded-xl h-10 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-[#125d72]/20 transition-transform active:scale-95"
                            >
                                <Settings2 className="h-3 w-3" /> Kelola Sesi Rapat
                            </Button>

                            <ActionDropdown
                                group={group}
                                onExport={() => handleExportRakordir(group.meetingNumber, group.meetingYear)}
                                onUpload={() => handleOpenUpload(group)}
                                isExporting={isExporting}
                            />
                        </div>
                    </div>
                ))}

                {/* ✅ Render Dialog di Grid View */}
                <UploadNotulensiDialog
                    agenda={selectedGroup}
                    open={uploadOpen}
                    onOpenChange={setUploadOpen}
                />
            </div>
        )
    }

    // Table View
    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari ID Notulensi atau Lokasi..."
                        className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-xl text-xs font-bold focus:ring-[#14a2ba]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-200">
                            <TableHead className="w-45 text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                                ID Notulensi
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                                Pelaksanaan
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                                Lokasi
                            </TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                                Agenda
                            </TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                                Status
                            </TableHead>
                            <TableHead className="w-25"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">
                                    Tidak ada sesi Rakordir ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((group) => (
                                <TableRow key={group.groupKey} className="hover:bg-slate-50/50 transition-colors group">
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-black text-slate-800 text-xs">
                                            <Hash className="h-3 w-3 text-[#14a2ba]" />
                                            {group.meetingNumber} / {group.meetingYear}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-bold text-slate-600">
                                        {group.executionDate
                                            ? format(new Date(group.executionDate), "dd MMM yyyy", { locale: id })
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-[11px] font-bold text-slate-500 italic truncate max-w-50">
                                        {group.location || "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] font-black px-3">
                                            {group.agendas.length} MATERI
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={group.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ActionDropdown
                                            group={group}
                                            onExport={() => handleExportRakordir(group.meetingNumber, group.meetingYear)}
                                            onUpload={() => handleOpenUpload(group)}
                                            isExporting={isExporting}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ✅ Render Dialog di Table View */}
            <UploadNotulensiDialog
                agenda={selectedGroup}
                open={uploadOpen}
                onOpenChange={setUploadOpen}
            />
        </div>
    )
}

// ✅ Update ActionDropdown dengan logika tombol kondisional
function ActionDropdown({
    group,
    onExport,
    onUpload,
    isExporting,
}: {
    group: any
    onExport: () => void
    onUpload: () => void
    isExporting: boolean
}) {
    const router = useRouter()

    // ✅ 1. Cek keberadaan file pada agenda pertama di grup tersebut
    const finalMinutesPath = group.agendas[0]?.risalahTtd

    // ✅ 2. Handler Download
    const handleDownloadFinal = async () => {
        if (!finalMinutesPath) {
            toast.error("File tidak ditemukan")
            return
        }

        const res = await getSignedFileUrl(finalMinutesPath)
        if (res.success && res.url) {
            // Membuka file di tab baru
            window.open(res.url, "_blank")
            toast.success("Membuka file notulensi...")
        } else {
            toast.error("Gagal mendapatkan link download")
        }
    }

    // ✅ 3. Handler Hapus (Dengan Dialog Konfirmasi)
    const handleDeleteFinal = async () => {
        // Menggunakan confirm bawaan browser agar ringkas,
        // atau bisa gunakan AlertDialog dari shadcn jika sudah ada.
        const confirmDelete = window.confirm(
            "Apakah Anda yakin ingin menghapus Notulensi Final ini? Status agenda akan dikembalikan ke 'DIJADWALKAN'."
        )

        if (!confirmDelete) return

        const toastId = toast.loading("Sedang menghapus...")
        const res = await deleteFinalMinutesAction(group.agendas[0].id)

        if (res.success) {
            toast.success("Notulensi berhasil dihapus", { id: toastId })
        } else {
            toast.error(res.error || "Gagal menghapus", { id: toastId })
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-xl border-slate-200">
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2">
                    Opsi Sesi
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Tombol Kelola (Selalu ada) */}
                <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-[#125d72]/5 group"
                    onClick={() => router.push(`/pelaksanaan-rapat/rakordir/live?number=${group.meetingNumber}&year=${group.meetingYear}`)}
                >
                    <Settings2 className="h-4 w-4 text-slate-400 group-hover:text-[#125d72]" />
                    <span className="text-xs font-bold text-slate-700">Kelola Sesi Rapat</span>
                </DropdownMenuItem>

                {/* ✅ KONDISI: JIKA BELUM UPLOAD */}
                {!finalMinutesPath ? (
                    <DropdownMenuItem
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-emerald-50 group"
                        onClick={onUpload}
                    >
                        <FileUp className="h-4 w-4 text-emerald-600 group-hover:text-emerald-700" />
                        <span className="text-xs font-bold text-slate-700">Upload Notulensi Final</span>
                    </DropdownMenuItem>
                ) : (
                    /* ✅ KONDISI: JIKA SUDAH UPLOAD (DOWNLOAD + DELETE) */
                    <>
                        <DropdownMenuItem
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-blue-50 group"
                            onClick={handleDownloadFinal}
                        >
                            <FileDown className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                            <span className="text-xs font-bold text-slate-700">Download Notulensi Final</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-red-50 group"
                            onClick={handleDeleteFinal}
                        >
                            <Trash2 className="h-4 w-4 text-red-500 group-hover:text-red-700" />
                            <span className="text-xs font-bold text-red-600">Hapus Notulensi</span>
                        </DropdownMenuItem>
                    </>
                )}

                <DropdownMenuSeparator />

                {/* Export Draft (Selalu ada) */}
                <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-slate-50 group"
                    disabled={isExporting}
                    onClick={onExport}
                >
                    <FileText className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                    <span className="text-xs font-bold text-slate-700">Export Draft Notulensi</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[9px] text-slate-400 px-3 py-1 italic" disabled>
                    ID Sesi: {group.groupKey}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function StatusBadge({ status }: { status: string }) {
    const isCompleted = status === "COMPLETED" || status === "SELESAI"
    return (
        <Badge
            className={cn(
                "border-none text-[9px] font-black flex w-fit items-center gap-1 mx-auto px-3 py-1",
                isCompleted ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}
        >
            {isCompleted ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
            {isCompleted ? "SELESAI" : "DRAF"}
        </Badge>
    )
}