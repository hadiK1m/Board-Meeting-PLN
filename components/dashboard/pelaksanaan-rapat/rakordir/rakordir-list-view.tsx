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
    ExternalLink,
    FileText,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    Download,
    Hash,
    Settings2
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
import { cn } from "@/lib/utils"

interface RakordirListViewProps {
    initialData: any[] // Menerima groupedMeetings dari Server Component
    viewMode: "table" | "grid"
}

export function RakordirListView({ initialData, viewMode }: RakordirListViewProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    // Filter data berdasarkan nomor rapat, tahun, atau lokasi
    const filteredData = initialData.filter((item) => {
        const searchStr = `${item.meetingNumber} ${item.location} ${item.meetingYear}`.toLowerCase()
        return searchStr.includes(searchTerm.toLowerCase())
    })

    // Fungsi Utama Export dengan Trigger Download Otomatis
    const onExport = async (meetingNumber: string, meetingYear: string) => {
        setIsExporting(true)
        const toastId = toast.loading("Sedang menyiapkan dokumen notulensi...")

        try {
            const result = await exportRakordirToDocx(meetingNumber, meetingYear)

            if (result.success && result.data) {
                // Konversi Base64 ke Blob
                const byteCharacters = atob(result.data)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                })

                // Trigger Download di Browser
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `Notulensi_Rakordir_${meetingNumber}_${meetingYear}.docx`
                document.body.appendChild(link)
                link.click()

                // Cleanup
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)

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
                {filteredData.map((meeting) => (
                    <div key={meeting.groupKey} className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText size={80} className="text-[#125d72]" />
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <Badge className="bg-[#125d72]/10 text-[#125d72] border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
                                    #{meeting.meetingNumber} / {meeting.meetingYear}
                                </Badge>
                                <h3 className="text-sm font-black text-slate-800 uppercase leading-tight mt-2">
                                    {meeting.agendas.length} Materi Agenda
                                </h3>
                            </div>
                            <StatusBadge status={meeting.status} />
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Calendar className="h-3.5 w-3.5 text-[#14a2ba]" />
                                <span className="text-[11px] font-bold uppercase tracking-tight">
                                    {meeting.executionDate ? format(new Date(meeting.executionDate), "EEEE, dd MMM yyyy", { locale: id }) : "TBD"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <MapPin className="h-3.5 w-3.5 text-[#14a2ba]" />
                                <span className="text-[11px] font-bold uppercase tracking-tight truncate">
                                    {meeting.location || "Lokasi belum diatur"}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => router.push(`/pelaksanaan-rapat/rakordir/live?number=${meeting.meetingNumber}&year=${meeting.meetingYear}`)}
                                className="flex-1 bg-[#125d72] hover:bg-[#0e4b5d] text-white rounded-xl h-10 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-[#125d72]/20 transition-transform active:scale-95"
                            >
                                <ExternalLink className="h-3 w-3" /> Buka Ruang
                            </Button>
                            <ActionMenu
                                meeting={meeting}
                                isExporting={isExporting}
                                onExport={() => onExport(meeting.meetingNumber, meeting.meetingYear)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Search Bar */}
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
                            <TableHead className="w-[180px] text-[10px] font-black uppercase tracking-widest text-[#125d72]">ID Notulensi</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">Pelaksanaan</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">Lokasi</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-[#125d72]">Agenda</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-[#125d72]">Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
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
                            filteredData.map((meeting) => (
                                <TableRow key={meeting.groupKey} className="hover:bg-slate-50/50 transition-colors group">
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-black text-slate-800 text-xs">
                                            <Hash className="h-3 w-3 text-[#14a2ba]" />
                                            {meeting.meetingNumber} / {meeting.meetingYear}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-bold text-slate-600">
                                        {meeting.executionDate ? format(new Date(meeting.executionDate), "dd MMM yyyy", { locale: id }) : "-"}
                                    </TableCell>
                                    <TableCell className="text-[11px] font-bold text-slate-500 italic truncate max-w-[200px]">
                                        {meeting.location || "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] font-black px-3">
                                            {meeting.agendas.length} MATERI
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={meeting.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg hover:bg-[#125d72]/10 text-[#125d72]"
                                                onClick={() => router.push(`/pelaksanaan-rapat/rakordir/live?number=${meeting.meetingNumber}&year=${meeting.meetingYear}`)}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                            <ActionMenu
                                                meeting={meeting}
                                                isExporting={isExporting}
                                                onExport={() => onExport(meeting.meetingNumber, meeting.meetingYear)}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function ActionMenu({ meeting, isExporting, onExport }: any) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-slate-200">
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-tighter">Opsi Ekspor</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-[#125d72]/10 group rounded-lg"
                    disabled={isExporting}
                    onClick={onExport}
                >
                    <Download className="h-4 w-4 text-slate-400 group-hover:text-[#125d72]" />
                    <span className="text-xs font-bold text-slate-700">Ekspor Notulensi (.docx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer focus:bg-slate-100 text-slate-400 italic rounded-lg">
                    <Settings2 className="h-4 w-4" />
                    <span className="text-[10px] font-medium">Audit Log Notulensi</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function StatusBadge({ status }: { status: string }) {
    const isCompleted = status === "COMPLETED" || status === "SELESAI"
    return (
        <Badge className={cn(
            "border-none text-[9px] font-black flex w-fit items-center gap-1 mx-auto px-3 py-1",
            isCompleted
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-600"
        )}>
            {isCompleted ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
            {isCompleted ? "SELESAI" : "DRAF"}
        </Badge>
    )
}