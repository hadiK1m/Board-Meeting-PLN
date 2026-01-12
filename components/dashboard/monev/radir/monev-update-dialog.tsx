/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
// ✅ Import AlertDialog untuk konfirmasi hapus
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, FileText, CheckCircle2, AlertCircle, Upload, X, Eye, Badge, Trash2, FileCheck } from "lucide-react"
import { updateMonevDecisionAction, getEvidenceUrlAction } from "@/server/actions/monev-radir-actions"
import { MonevDecisionItem } from "@/lib/types/monev"

interface MonevUpdateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agenda: any
}

export function MonevUpdateDialog({ open, onOpenChange, agenda }: MonevUpdateDialogProps) {
    const decisions: MonevDecisionItem[] = Array.isArray(agenda.meetingDecisions)
        ? agenda.meetingDecisions
        : []

    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleUpdateItem = async (decisionId: string, form: FormData) => {
        setLoadingId(decisionId)
        try {
            const res = await updateMonevDecisionAction(agenda.id, decisionId, form)
            if (res.success) toast.success("Progress berhasil disimpan")
            else toast.error(res.error)
        } catch (error) {
            toast.error("Terjadi kesalahan sistem")
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
            <DialogContent
                className="
                    w-full max-w-full h-full sm:max-w-4xl sm:max-h-[90vh] 
                    overflow-y-auto rounded-none sm:rounded-2xl p-0 
                    bg-white shadow-2xl border-0 sm:border
                "
            >
                {/* Tombol Close (X) di Pojok Kanan Atas */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 z-50 h-10 w-10 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Tutup</span>
                </Button>

                {/* Header */}
                <DialogHeader className="bg-linear-to-r from-[#125d72] to-[#0d4a5b] text-white p-6 sm:p-8 sticky top-0 z-20 rounded-t-2xl">
                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3">
                        <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-[#efe62f]" />
                        Update Monitoring & Evaluasi
                    </DialogTitle>
                    <DialogDescription className="text-white/80 mt-2 text-sm sm:text-base">
                        Agenda: <span className="font-semibold text-white">{agenda.title}</span>
                    </DialogDescription>
                </DialogHeader>

                {/* Content */}
                <div className="p-5 sm:p-8 space-y-8 bg-linear-to-b from-white to-slate-50/50">
                    {decisions.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 bg-white rounded-xl border border-dashed border-slate-300 shadow-inner">
                            <FileText className="h-12 w-12 sm:h-14 sm:w-14 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">Tidak Ada Keputusan</h3>
                            <p className="text-slate-500 text-sm sm:text-base">Agenda ini belum memiliki butir keputusan yang tercatat.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 sm:space-y-8">
                            {decisions.map((item, index) => (
                                <DecisionItemCard
                                    key={item.id || index}
                                    item={item}
                                    index={index}
                                    isLoading={loadingId === item.id}
                                    onUpdate={(formData) => handleUpdateItem(item.id, formData)}
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

function DecisionItemCard({
    item,
    index,
    isLoading,
    onUpdate,
    onOpenEvidence
}: {
    item: MonevDecisionItem
    index: number
    isLoading: boolean
    onUpdate: (fd: FormData) => void
    onOpenEvidence: (path: string) => void
}) {
    const [output, setOutput] = useState(item.targetOutput || "")
    const [progress, setProgress] = useState(item.currentProgress || "")
    const [status, setStatus] = useState(item.status || "ON_PROGRESS")
    const [file, setFile] = useState<File | null>(null)

    // ✅ State baru untuk handle penghapusan file lama
    const [isExistingDeleted, setIsExistingDeleted] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append("targetOutput", output)
        formData.append("currentProgress", progress)
        formData.append("status", status)

        if (file) {
            formData.append("evidenceFile", file)
        }

        // ✅ Kirim sinyal hapus ke server jika user menghapus file lama
        if (isExistingDeleted && !file) {
            formData.append("removeEvidence", "true")
        }

        onUpdate(formData)
        setFile(null)
    }

    const handleDeleteConfirm = () => {
        setIsExistingDeleted(true)
        setDeleteDialogOpen(false)
        toast.success("File evidence dihapus. Klik Simpan Update untuk memproses.")
    }

    const isDone = status === 'DONE'

    return (
        <>
            <Card className={`border transition-all duration-300 shadow-sm hover:shadow-lg ${isDone
                ? 'border-emerald-200 bg-linear-to-b from-emerald-50/40 to-white'
                : 'border-slate-200 bg-white'
                } rounded-xl overflow-hidden`}>
                <CardContent className="p-0">
                    {/* Header Card */}
                    <div className={`px-5 sm:px-6 py-4 border-b flex items-center justify-between ${isDone ? 'bg-emerald-50/80 border-emerald-100' : 'bg-slate-50 border-slate-100'
                        }`}>
                        <div className="flex items-center gap-4 flex-1">
                            <div className={`flex-none w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-sm ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                {index + 1}
                            </div>
                            <p className="font-semibold text-base sm:text-lg text-slate-800 line-clamp-1 flex-1">
                                {item.text}
                            </p>
                        </div>
                        {isDone && (
                            <Badge className="bg-emerald-600 text-white border-none px-3 py-1 text-xs sm:text-sm font-bold hidden sm:flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
                            </Badge>
                        )}
                    </div>

                    {/* Form Body */}
                    <div className="p-5 sm:p-6">
                        {/* Teks Keputusan */}
                        <div className="bg-slate-50/80 p-4 sm:p-5 rounded-lg border border-slate-200 text-sm sm:text-base text-slate-700 mb-6 leading-relaxed shadow-inner">
                            <span className="font-bold text-slate-800 block mb-2 uppercase tracking-wide text-xs sm:text-sm">Butir Keputusan:</span>
                            {item.text}
                        </div>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            {/* Output */}
                            <div className="space-y-2">
                                <Label className="text-xs sm:text-sm font-bold uppercase text-slate-600 tracking-wide">Output</Label>
                                <Input
                                    value={output}
                                    onChange={(e) => setOutput(e.target.value)}
                                    placeholder="Contoh: Dokumen SK Terbit"
                                    className="h-10 sm:h-11 text-sm sm:text-base rounded-lg border-slate-300 focus:ring-[#125d72] focus:border-[#125d72] shadow-sm"
                                />
                            </div>

                            {/* Progress Terkini */}
                            <div className="space-y-2">
                                <Label className="text-xs sm:text-sm font-bold uppercase text-slate-600 tracking-wide">Progress Terkini</Label>
                                <Input
                                    value={progress}
                                    onChange={(e) => setProgress(e.target.value)}
                                    placeholder="Update status pengerjaan..."
                                    className="h-10 sm:h-11 text-sm sm:text-base rounded-lg border-slate-300 focus:ring-[#125d72] focus:border-[#125d72] shadow-sm"
                                />
                            </div>

                            {/* ✅ EVIDENCE FILE SECTION (MODIFIED) */}
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs sm:text-sm font-bold uppercase text-slate-600 tracking-wide">Evidence (Bukti Fisik)</Label>

                                {/* Kondisi: Jika File Ada di Database DAN Belum Dihapus User */}
                                {item.evidencePath && !isExistingDeleted ? (
                                    <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                                <FileCheck className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate">Dokumen Evidence Terupload</p>
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenEvidence(item.evidencePath!)}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                                >
                                                    <Eye className="h-3 w-3" /> Lihat File
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tombol Hapus (X) dengan Dialog Konfirmasi */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            onClick={() => setDeleteDialogOpen(true)}
                                            title="Hapus file ini"
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ) : (
                                    /* Tampilan Input Upload Biasa (Jika file belum ada atau sudah dihapus) */
                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                        <div className="flex-1 relative">
                                            <Input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                className="h-10 sm:h-11 text-sm sm:text-base cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors shadow-sm"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            />
                                            {/* Tombol Reset Input File Baru */}
                                            {file && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <span className="text-xs sm:text-sm text-slate-600 font-medium truncate max-w-35 sm:max-w-50">
                                                        {file.name}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 sm:h-7 sm:w-7 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => setFile(null)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status & Submit */}
                            <div className="space-y-2 md:col-span-2 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                                <div className="flex-1 space-y-1.5">
                                    <Label className="text-xs sm:text-sm font-bold uppercase text-slate-600 tracking-wide">Status</Label>
                                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                        <SelectTrigger className={`h-10 sm:h-11 text-sm sm:text-base font-semibold rounded-lg shadow-sm ${status === 'DONE'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-amber-50 border-amber-200 text-amber-700'
                                            }`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ON_PROGRESS">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-500" /> In Progress
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="DONE">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Selesai
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`min-w-35 sm:min-w-40 h-10 sm:h-11 text-sm sm:text-base font-bold uppercase tracking-wider shadow-md transition-all ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#125d72] hover:bg-[#0d4a5b]'
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Update"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </CardContent>
            </Card>

            {/* ✅ Dialog Konfirmasi Hapus Evidence */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus File Evidence?</AlertDialogTitle>
                        <AlertDialogDescription>
                            File evidence yang tersimpan akan dihapus dari sistem.
                            Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Ya, Hapus File
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}