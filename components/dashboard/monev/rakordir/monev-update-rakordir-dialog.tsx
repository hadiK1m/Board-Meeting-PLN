/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import Image from "next/image"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import {
    Loader2,
    FileText,
    CheckCircle2,
    AlertCircle,
    X,
    Eye,
    Badge,
    Trash2,
    FileCheck,
    Save,
    Target,
    TrendingUp,
    Calendar
} from "lucide-react"

// Server Actions
import {
    updateMonevArahanAction,
    getEvidenceUrlAction,
} from "@/server/actions/monev-rakordir-actions"

interface MonevUpdateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agenda: any
}

/* ============================
   MAIN DIALOG COMPONENT
============================ */
export function MonevUpdateRakordirDialog({
    open,
    onOpenChange,
    agenda,
}: MonevUpdateDialogProps) {

    // ✅ PERBAIKAN UTAMA: Ambil data dari arahanDireksi (bukan meetingDecisions)
    const parseArahanDireksi = () => {
        try {
            // Prioritas: arahanDireksi (field yang benar untuk RAKORDIR)
            const arahanData = agenda.arahanDireksi || agenda.arahan_direksi

            if (!arahanData) return []

            if (typeof arahanData === 'string') {
                return JSON.parse(arahanData)
            }
            if (Array.isArray(arahanData)) {
                return arahanData
            }
            return []
        } catch (error) {
            console.error('Error parsing arahanDireksi:', error)
            // Fallback ke meetingDecisions untuk kompatibilitas backward
            try {
                if (typeof agenda.meetingDecisions === 'string') {
                    return JSON.parse(agenda.meetingDecisions)
                }
                if (Array.isArray(agenda.meetingDecisions)) {
                    return agenda.meetingDecisions
                }
            } catch {
                // ignore fallback error
            }
            return []
        }
    }

    const arahans = parseArahanDireksi()

    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Hitung progress untuk header
    const totalArahans = arahans.length
    const completedArahans = arahans.filter((a: any) => a.status === "DONE").length
    const progressPercentage = totalArahans > 0 ? Math.round((completedArahans / totalArahans) * 100) : 0

    const handleUpdateItem = async (
        arahanId: string,
        form: FormData
    ) => {
        setLoadingId(arahanId)
        try {
            const res = await updateMonevArahanAction(
                agenda.id,
                arahanId,
                form
            )
            if (res.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg min-w-87.5 animate-in slide-in-from-bottom-5">
                        <div className="shrink-0">
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Progress Berhasil Disimpan</h4>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                                Arahan Direksi Telah Diperbarui
                            </p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ), { duration: 4000 })

                // Trigger revalidation parent component jika diperlukan
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('arahan-updated'))
                }
            }
            else {
                toast.error(res.error || "Gagal menyimpan perubahan")
            }
        } catch (error: any) {
            toast.error(error.message || "Terjadi kesalahan sistem")
        } finally {
            setLoadingId(null)
        }
    }

    const handleOpenEvidence = async (path: string) => {
        const url = await getEvidenceUrlAction(path)
        if (url) window.open(url, "_blank")
        else toast.error("Gagal membuka file")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-full h-full sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl p-0 bg-white shadow-2xl border-0 sm:border">
                <Button

                    size="icon"
                    className="absolute right-4 top-4 z-50 h-10 w-10 rounded-full hover:bg-white/20 text-white hover:text-white transition-colors"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-5 w-5" />
                </Button>

                <DialogHeader className="bg-[#125d72] text-white p-6 sm:p-8 sticky top-0 z-20 shadow-md">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                                <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-3 tracking-tight">
                                    <FileText className="h-6 w-6 text-[#efe62f]" />
                                    MONITORING ARAHAN DIREKSI RAKORDIR
                                </DialogTitle>
                                <DialogDescription className="text-[#e7f6f9]/90 font-medium">
                                    <span className="font-bold text-white block truncate max-w-2xl">
                                        {agenda.title}
                                    </span>
                                </DialogDescription>
                            </div>

                            {totalArahans > 0 && (
                                <div className="bg-white/20 px-4 py-3 rounded-lg min-w-32 text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                                        PROGRESS
                                    </div>
                                    <div className="text-lg font-black mt-1">
                                        {completedArahans}/{totalArahans}
                                    </div>
                                    <div className="w-full bg-white/30 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="bg-[#efe62f] h-full rounded-full transition-all duration-500"
                                            style={{ width: `${progressPercentage}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] font-bold mt-1">
                                        {progressPercentage}% SELESAI
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info tambahan agenda */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/20">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                    {agenda.executionDate ? new Date(agenda.executionDate).toLocaleDateString('id-ID') : '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Target className="h-3.5 w-3.5" />
                                <span className="text-xs">{agenda.meetingNumber || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                    Status: <span className="font-bold">
                                        {agenda.monevStatus === "DONE" ? "SELESAI" : "DALAM PROGRESS"}
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                    {totalArahans} Arahan
                                </span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 sm:p-8 space-y-8 bg-slate-50/50 min-h-125">
                    {arahans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <FileText className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Tidak Ada Arahan Direksi</h3>
                            <p className="text-slate-500 text-sm text-center max-w-md">
                                Agenda ini belum memiliki arahan dari direksi yang perlu dimonitor.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">
                                    Daftar Arahan Direksi ({totalArahans} item)
                                </h3>
                                <div className="text-xs text-slate-500">
                                    Terakhir update: {new Date(agenda.updatedAt || agenda.createdAt).toLocaleDateString('id-ID')}
                                </div>
                            </div>

                            {arahans.map((item: any, index: number) => (
                                <ArahanItemCard
                                    key={item.id || `arahan-${index}`}
                                    item={item}
                                    index={index}
                                    isLoading={loadingId === item.id}
                                    onUpdate={(formData) =>
                                        handleUpdateItem(item.id, formData)
                                    }
                                    onOpenEvidence={handleOpenEvidence}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

/* ============================
   ARAHAN ITEM CARD COMPONENT
============================ */
interface ArahanItemCardProps {
    item: any
    index: number
    isLoading: boolean
    onUpdate: (formData: FormData) => void
    onOpenEvidence: (path: string) => void
}

function ArahanItemCard({
    item,
    index,
    isLoading,
    onUpdate,
    onOpenEvidence,
}: ArahanItemCardProps) {

    const [output, setOutput] = useState(item.targetOutput || "")
    const [progress, setProgress] = useState(item.currentProgress || "")
    const [status, setStatus] = useState<string>(item.status || "ON_PROGRESS")
    const [file, setFile] = useState<File | null>(null)
    const [isExistingDeleted, setIsExistingDeleted] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // Validasi sederhana
        if (!progress.trim()) {
            toast.error("Progress terkini wajib diisi")
            return
        }

        const formData = new FormData()
        formData.append("targetOutput", output)
        formData.append("currentProgress", progress)
        formData.append("status", status)

        if (file) formData.append("evidenceFile", file)
        if (isExistingDeleted && !file) {
            formData.append("removeEvidence", "true")
        }

        onUpdate(formData)
        setFile(null)
        setIsExistingDeleted(false)
    }

    const handleDeleteConfirm = () => {
        setIsExistingDeleted(true)
        setDeleteDialogOpen(false)
        toast.success("File evidence ditandai untuk dihapus")
    }

    const isDone = status === "DONE"
    const hasEvidence = item.evidencePath && !isExistingDeleted

    return (
        <>
            <Card className={`border transition-all duration-300 shadow-sm hover:shadow-md ${isDone ? 'border-emerald-200 ring-1 ring-emerald-100 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                <CardContent className="p-0">
                    {/* Header Card */}
                    <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${isDone ? 'bg-emerald-50/50' : 'bg-slate-50/50'}`}>
                        <div className="flex items-start gap-4 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isDone ? 'bg-emerald-600 text-white' : 'bg-[#125d72] text-white'}`}>
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800 text-sm md:text-base leading-snug">
                                    {item.text || "Arahan direksi tidak tersedia"}
                                </p>
                                {item.lastUpdated && (
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Update: {new Date(item.lastUpdated).toLocaleDateString('id-ID')}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isDone ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Selesai
                            </Badge>
                        ) : (
                            <Badge className="text-slate-500 border-slate-300 bg-white">
                                {isLoading ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                Dalam Progress
                            </Badge>
                        )}
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5" />
                                    Target Output
                                </Label>
                                <Input
                                    value={output}
                                    onChange={(e) => setOutput(e.target.value)}
                                    placeholder="Contoh: Dokumen SK Terbit, Laporan Final, dll"
                                    className="h-11 border-slate-200 focus:border-[#14a2ba] focus:ring-[#14a2ba]"
                                />
                                <p className="text-[10px] text-slate-500">
                                    Output yang diharapkan dari arahan ini
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    Progress Terkini
                                </Label>
                                <Input
                                    value={progress}
                                    onChange={(e) => setProgress(e.target.value)}
                                    placeholder="Update status pengerjaan..."
                                    className="h-11 border-slate-200 focus:border-[#14a2ba] focus:ring-[#14a2ba]"
                                    required
                                />
                                <p className="text-[10px] text-slate-500">
                                    Wajib diisi - jelaskan progress terkini
                                </p>
                            </div>
                        </div>

                        {/* Evidence Section */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide">
                                Evidence (Bukti Dukung)
                            </Label>

                            {hasEvidence ? (
                                <div className="flex items-center justify-between p-4 border border-blue-100 bg-blue-50/50 rounded-lg group hover:border-blue-300 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                            <FileCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => onOpenEvidence(item.evidencePath)}
                                                className="text-blue-700 font-semibold text-sm hover:underline text-left"
                                            >
                                                Lihat File Evidence
                                            </button>
                                            <p className="text-[10px] text-blue-600">
                                                Klik untuk membuka file
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"

                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-3 rounded-lg"
                                            onClick={() => onOpenEvidence(item.evidencePath)}
                                        >
                                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                                            Lihat
                                        </Button>
                                        <Button
                                            type="button"

                                            size="sm"
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
                                            onClick={() => setDeleteDialogOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        className="h-11 border-slate-200 bg-slate-50/50 file:bg-[#125d72] file:text-white file:border-none file:rounded-md file:mr-4 file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase cursor-pointer hover:bg-slate-50 focus:border-[#14a2ba]"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    {file && (
                                        <div className="flex items-center justify-between mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <span className="text-sm font-medium text-emerald-700 truncate">
                                                {file.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setFile(null)}
                                                className="text-emerald-500 hover:text-red-500"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        Unggah file bukti (PDF, gambar, atau dokumen) - maks. 10MB
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Status dan Submit */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4">
                            <div className="w-full md:w-1/2 space-y-2">
                                <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide">
                                    Status Penyelesaian
                                </Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-11 border-slate-200 font-medium">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ON_PROGRESS">
                                            <div className="flex items-center gap-2 text-amber-600 font-bold">
                                                <AlertCircle className="h-4 w-4" /> Dalam Progress
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="DONE">
                                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                                <CheckCircle2 className="h-4 w-4" /> Selesai
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-11 px-6 bg-slate-100 text-slate-500 font-bold rounded-lg">
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </div>
                                ) : (
                                    <>
                                        <Button
                                            type="button"

                                            onClick={() => {
                                                setOutput(item.targetOutput || "")
                                                setProgress(item.currentProgress || "")
                                                setStatus(item.status || "ON_PROGRESS")
                                                setFile(null)
                                                setIsExistingDeleted(false)
                                            }}
                                            className="h-11 px-4 font-bold text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                                            disabled={isLoading}
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`h-11 px-6 font-bold uppercase tracking-wider shadow-lg transition-all min-w-32 ${isLoading ? 'bg-slate-300 text-slate-500' : 'bg-[#125d72] hover:bg-[#0e4b5c] text-white'}`}
                                        >
                                            {isDone ? (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Update Progress
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Simpan Progress
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-xl border-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2 font-bold">
                            <AlertCircle className="h-5 w-5" /> Hapus Evidence?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 font-medium">
                            File bukti akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto font-bold text-slate-500">
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Ya, Hapus Permanen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

/* ============================
   CUSTOM EVENT TYPES
============================ */
declare global {
    interface Window {
        dispatchEvent(event: CustomEvent): void;
    }
}