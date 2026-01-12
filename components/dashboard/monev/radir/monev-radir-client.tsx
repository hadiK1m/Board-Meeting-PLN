"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Search, Filter, MoreHorizontal, Edit, Download, ExternalLink, CheckCircle2, Clock, Phone } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { toast } from "sonner"
import { MonevUpdateDialog } from "./monev-update-dialog"
import { getRisalahDownloadUrlAction } from "@/server/actions/radir-actions"

interface MonevRadirClientProps {
    initialData: any[] // Tipe data dari server
}

export function MonevRadirClient({ initialData }: MonevRadirClientProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_PROGRESS" | "DONE">("ALL")

    // State untuk Dialog Update
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedAgenda, setSelectedAgenda] = useState<any>(null)

    // Filter Logic
    const filteredData = initialData.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.meetingNumber?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "ALL"
            ? true
            : item.monevStatus === statusFilter

        return matchesSearch && matchesStatus
    })

    // Handler Download Risalah
    const handleDownloadRisalah = async (path: string | null) => {
        if (!path) return toast.error("File risalah belum tersedia.")
        try {
            const res = await getRisalahDownloadUrlAction(path)
            if (res.success && res.url) window.open(res.url, "_blank")
            else toast.error(res.error)
        } catch (e) {
            toast.error("Gagal mendownload file.")
        }
    }

    return (
        <div className="space-y-6">
            {/* Toolbar Filter */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari Judul atau No. Rapat..."
                        className="pl-9 h-10 bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant={statusFilter === "ALL" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("ALL")}
                        className={statusFilter === "ALL" ? "bg-[#125d72]" : ""}
                    >
                        Semua
                    </Button>
                    <Button
                        variant={statusFilter === "ON_PROGRESS" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("ON_PROGRESS")}
                        className={statusFilter === "ON_PROGRESS" ? "bg-amber-500 hover:bg-amber-600" : "text-amber-600 border-amber-200 bg-amber-50"}
                    >
                        On Progress
                    </Button>
                    <Button
                        variant={statusFilter === "DONE" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("DONE")}
                        className={statusFilter === "DONE" ? "bg-emerald-500 hover:bg-emerald-600" : "text-emerald-600 border-emerald-200 bg-emerald-50"}
                    >
                        Selesai
                    </Button>
                </div>
            </div>

            {/* Tabel Utama */}
            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[30%] min-w-[300px]">Agenda & Pemrakarsa</TableHead>
                            <TableHead className="w-[20%]">Narahubung</TableHead>
                            <TableHead className="w-[15%] text-center">Risalah</TableHead>
                            <TableHead className="w-[20%] text-center">Status Monev</TableHead>
                            <TableHead className="w-[10%] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">
                                    Data tidak ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                    <TableCell className="align-top py-4">
                                        <div className="space-y-1">
                                            <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-300">
                                                #{item.meetingNumber}/{item.meetingYear}
                                            </Badge>
                                            <p className="font-semibold text-sm text-slate-800 line-clamp-2" title={item.title}>
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-medium text-[#125d72] bg-[#125d72]/10 px-2 py-0.5 rounded">
                                                    {item.initiator || "Tanpa Pemrakarsa"}
                                                </span>
                                                <span>•</span>
                                                <span>{item.executionDate ? format(new Date(item.executionDate), "dd MMM yyyy", { locale: id }) : "-"}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell className="align-top py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-900">{item.contactPerson || "-"}</p>
                                            <p className="text-xs text-slate-500">{item.position || "-"}</p>
                                            {item.phone && (
                                                <a
                                                    href={`https://wa.me/${item.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full mt-1 border border-emerald-100 transition-colors"
                                                >
                                                    <Phone className="h-3 w-3" /> Chat WA
                                                </a>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="align-top py-4 text-center">
                                        {item.risalahTtd ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                                onClick={() => handleDownloadRisalah(item.risalahTtd)}
                                            >
                                                <Download className="h-3.5 w-3.5 mr-1" /> Unduh
                                            </Button>
                                        ) : (
                                            <Badge variant="secondary" className="text-slate-400 bg-slate-100">Belum Upload</Badge>
                                        )}
                                    </TableCell>

                                    <TableCell className="align-top py-4 text-center">
                                        {item.monevStatus === "DONE" ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200">
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> SELESAI
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200">
                                                <Clock className="h-3.5 w-3.5 mr-1" /> ON PROGRESS
                                            </Badge>
                                        )}

                                        {/* Hitung Progress Manual dari JSON */}
                                        <div className="mt-2 text-[10px] text-slate-500 font-medium">
                                            {(() => {
                                                const decisions = Array.isArray(item.meetingDecisions) ? item.meetingDecisions : []
                                                const doneCount = decisions.filter((d: any) => d.status === "DONE").length
                                                return `${doneCount} / ${decisions.length} Keputusan Selesai`
                                            })()}
                                        </div>
                                    </TableCell>

                                    <TableCell className="align-top py-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedAgenda(item)
                                                    setDialogOpen(true)
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> Update Progress
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(`/pelaksanaan-rapat/radir/live?number=${item.meetingNumber}&year=${item.meetingYear}`, '_blank')}>
                                                    <ExternalLink className="mr-2 h-4 w-4" /> Lihat Detail Rapat
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Dialog Update Progress */}
            {selectedAgenda && (
                <MonevUpdateDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    agenda={selectedAgenda}
                />
            )}
        </div>
    )
}