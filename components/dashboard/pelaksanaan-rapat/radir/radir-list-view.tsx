/* eslint-disable @typescript-eslint/no-unused-vars */
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
    Download,
    Eye,
    CheckCircle2,
    Clock,
    Upload,
    Trash2, // Icon Trash
    FileCheck, // Icon File Check
    Activity
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
import { exportRisalahToDocx } from "@/server/actions/export-actions"
import { getRisalahDownloadUrlAction } from "@/server/actions/radir-actions" // Action baru
import { UploadRisalahDialog } from "./upload-risalah-dialog"
import { DeleteRisalahDialog } from "./delete-risalah-dialog" // Dialog baru

interface RadirListViewProps {
    initialData: any[] // grouped meetings
    viewMode: "table" | "grid"
}

export function RadirListView({ initialData, viewMode }: RadirListViewProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    // State untuk Upload Dialog
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

    // State untuk Delete Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [fileToDelete, setFileToDelete] = useState("")

    // Shared State
    const [selectedAgendaId, setSelectedAgendaId] = useState("")
    const [selectedMeetingTitle, setSelectedMeetingTitle] = useState("")

    // Handler Buka Upload
    const handleOpenUpload = (agendaId: string, meetingNumber: string) => {
        setSelectedAgendaId(agendaId)
        setSelectedMeetingTitle(`Meeting #${meetingNumber}`)
        setUploadDialogOpen(true)
    }

    // Handler Buka Delete
    const handleOpenDelete = (agendaId: string, filePath: string) => {
        setSelectedAgendaId(agendaId)
        setFileToDelete(filePath)
        setDeleteDialogOpen(true)
    }

    const filteredData = initialData.filter((item) => {
        const search = searchTerm.toLowerCase()
        return (
            (item.meetingNumber?.toLowerCase() || "").includes(search) ||
            (item.location?.toLowerCase() || "").includes(search)
        )
    })

    if (viewMode === "grid") {
        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredData.map((group) => (
                        <div
                            key={group.groupKey}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group/card"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <Badge className="bg-[#125d72]/10 text-[#125d72] hover:bg-[#125d72]/20 border-none text-[10px] font-black">
                                        NOMOR MEETING: {group.meetingNumber}
                                    </Badge>
                                    <h3 className="text-sm font-black text-slate-800 uppercase leading-tight mt-2">
                                        TAHUN {group.meetingYear}
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    <StatusBadge status={group.status} />
                                    <ActionDropdown
                                        group={group}
                                        isExporting={isExporting}
                                        setIsExporting={setIsExporting}
                                        onOpenUpload={handleOpenUpload}
                                        onOpenDelete={handleOpenDelete} // Pass delete handler
                                    />
                                </div>
                            </div>

                            {/* ... Content Card Info (Sama seperti sebelumnya) ... */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-[11px] font-medium">
                                        {group.executionDate
                                            ? format(new Date(group.executionDate), "dd MMMM yyyy", { locale: id })
                                            : "-"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="text-[11px] font-medium truncate">
                                        {group.location || "Lokasi belum diatur"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="text-[11px] font-bold text-[#125d72]">
                                        {group.agendas.length} Agenda Terkait
                                    </span>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-[#125d72] hover:bg-[#0d4a5b] text-white text-[10px] font-black uppercase tracking-widest h-10 rounded-xl"
                                onClick={() =>
                                    router.push(
                                        `/pelaksanaan-rapat/radir/live?number=${group.meetingNumber}&year=${group.meetingYear}`
                                    )
                                }
                            >
                                <Settings2 className="mr-2 h-3.5 w-3.5" /> Kelola Sesi Rapat
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Dialogs */}
                <UploadRisalahDialog
                    open={uploadDialogOpen}
                    onOpenChange={setUploadDialogOpen}
                    agendaId={selectedAgendaId}
                    title={selectedMeetingTitle}
                />

                <DeleteRisalahDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    agendaId={selectedAgendaId}
                    filePath={fileToDelete}
                />
            </>
        )
    }

    // Table View
    return (
        <div className="space-y-4">
            {/* ... Search Bar ... */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Cari Nomor Meeting atau Lokasi..."
                    className="pl-10 h-10 rounded-xl border-slate-200 text-xs focus:ring-[#125d72]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nomor Meeting</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tanggal & Waktu</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lokasi</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Agenda</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Status</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-500">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-xs italic">Data tidak ditemukan...</TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((group) => (
                                <TableRow key={group.groupKey} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="font-black text-[#125d72] text-sm">#{group.meetingNumber}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Tahun {group.meetingYear}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-bold text-slate-700">
                                            {group.executionDate ? format(new Date(group.executionDate), "dd MMM yyyy", { locale: id }) : "-"}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium">{group.startTime} - {group.endTime}</div>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-slate-600">{group.location || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[9px] font-black border-slate-300">{group.agendas.length} AGENDA</Badge>
                                    </TableCell>
                                    <TableCell className="text-center"><StatusBadge status={group.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <ActionDropdown
                                            group={group}
                                            isExporting={isExporting}
                                            setIsExporting={setIsExporting}
                                            onOpenUpload={handleOpenUpload}
                                            onOpenDelete={handleOpenDelete} // Pass delete handler
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialogs */}
            <UploadRisalahDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                agendaId={selectedAgendaId}
                title={selectedMeetingTitle}
            />

            <DeleteRisalahDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                agendaId={selectedAgendaId}
                filePath={fileToDelete}
            />
        </div>
    )
}

// ----------------------------------------------------------------------
// Component: Action Dropdown
// ----------------------------------------------------------------------
function ActionDropdown({
    group,
    isExporting,
    setIsExporting,
    onOpenUpload,
    onOpenDelete,
}: {
    group: any
    isExporting: boolean
    setIsExporting: (val: boolean) => void
    onOpenUpload: (agendaId: string, meetingNumber: string) => void
    onOpenDelete: (agendaId: string, filePath: string) => void
}) {
    const router = useRouter()

    // Cek apakah ada risalah yang sudah diupload pada agenda pertama
    const firstAgenda = group.agendas && group.agendas[0]
    const risalahTtdPath = firstAgenda?.risalahTtd

    // Handler Download Risalah TTD
    const handleDownloadRisalahTtd = async () => {
        if (!risalahTtdPath) return
        toast.info("Mengunduh Risalah Final...")

        try {
            const res = await getRisalahDownloadUrlAction(risalahTtdPath)
            if (res.success && res.url) {
                // Buka link di tab baru untuk download
                window.open(res.url, "_blank")
            } else {
                toast.error("Gagal mendapatkan link download", { description: res.error })
            }
        } catch (err) {
            toast.error("Terjadi kesalahan saat download")
        }
    }

    const handleExport = async (type: "ISI" | "TTD") => {
        setIsExporting(true)
        toast.info(`Menyiapkan ${type === "ISI" ? "Risalah Isi" : "Risalah TTD"}...`)

        try {
            const res = await exportRisalahToDocx(group.meetingNumber, group.meetingYear, type)

            if (res.success && res.data) {
                const link = document.createElement("a")
                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${res.data}`
                link.download = res.filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success("Dokumen berhasil diunduh")
            } else {
                toast.error(res.error || "Gagal melakukan export")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan pada sistem export")
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#125d72]">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-xl border-slate-200">
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2">
                    Opsi Sesi Rapat
                </DropdownMenuLabel>

                <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-[#125d72]/5 group"
                    onClick={() =>
                        router.push(
                            `/pelaksanaan-rapat/radir/live?number=${group.meetingNumber}&year=${group.meetingYear}`
                        )
                    }
                >
                    <Settings2 className="h-4 w-4 text-slate-400 group-hover:text-[#125d72]" />
                    <span className="text-xs font-bold text-slate-700">Kelola Sesi Rapat</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* LOGIKA KONDISIONAL TOMBOL RISALAH TTD */}
                {risalahTtdPath ? (
                    // KONDISI 1: File ADA -> Tampilkan Download & Hapus
                    <div className="flex items-center gap-1 px-2 py-1">
                        <div
                            className="flex-1 flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-green-50 rounded-md text-green-700 transition-colors"
                            onClick={handleDownloadRisalahTtd}
                            title="Download Risalah Final"
                        >
                            <FileCheck className="h-4 w-4" />
                            <span className="text-xs font-bold">Download TTD</span>
                        </div>
                        <div
                            className="flex-none p-1.5 cursor-pointer hover:bg-red-50 rounded-md text-red-600 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                onOpenDelete(firstAgenda.id, risalahTtdPath)
                            }}
                            title="Hapus File"
                        >
                            <Trash2 className="h-4 w-4" />
                        </div>
                    </div>
                ) : (
                    // KONDISI 2: File TIDAK ADA -> Tampilkan Upload
                    <DropdownMenuItem
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-orange-50 group"
                        onClick={() => {
                            if (firstAgenda) {
                                onOpenUpload(firstAgenda.id, group.meetingNumber)
                            } else {
                                toast.error("Data agenda tidak ditemukan")
                            }
                        }}
                    >
                        <Upload className="h-4 w-4 text-orange-600 group-hover:text-orange-700" />
                        <span className="text-xs font-bold text-slate-700">Upload Risalah Final (TTD)</span>
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-blue-50 group"
                    disabled={isExporting}
                    onClick={() => handleExport("ISI")}
                >
                    <FileText className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                    <span className="text-xs font-bold text-slate-700">Export Risalah Isi (1.2)</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-emerald-50 group"
                    disabled={isExporting}
                    onClick={() => handleExport("TTD")}
                >
                    <Download className="h-4 w-4 text-emerald-600 group-hover:text-emerald-700" />
                    <span className="text-xs font-bold text-slate-700">Export Risalah TTD (1.3)</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-slate-100 text-slate-400 italic">
                    <Eye className="h-4 w-4" />
                    <span className="text-[10px] font-medium">Aksi lainnya menyusul...</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function StatusBadge({ status }: { status: string }) {
    // Menangani status Rapat Selesai
    if (status === "RAPAT_SELESAI" || status === "SELESAI_SIDANG" || status === "COMPLETED") {
        return (
            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none text-[9px] font-black flex w-fit items-center gap-1 mx-auto">
                <CheckCircle2 className="h-2.5 w-2.5" /> RAPAT SELESAI
            </Badge>
        )
    }

    // Menangani status Sedang Berlangsung / In Progress
    if (status === "SEDANG_BERLANGSUNG" || status === "ON_PROGRESS") {
        return (
            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none text-[9px] font-black flex w-fit items-center gap-1 mx-auto">
                <Activity className="h-2.5 w-2.5" /> SEDANG BERLANGSUNG
            </Badge>
        )
    }

    // Default (Dijadwalkan)
    return (
        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none text-[9px] font-black flex w-fit items-center gap-1 mx-auto">
            <Clock className="h-2.5 w-2.5" /> DIJADWALKAN
        </Badge>
    )
}