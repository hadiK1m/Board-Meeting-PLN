/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import Image from "next/image" // Import Image untuk logo toast
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
    Save
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

    const arahans = Array.isArray(agenda.meetingDecisions)
        ? agenda.meetingDecisions
        : []

    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleUpdateItem = async (
        decisionId: string,
        form: FormData
    ) => {
        setLoadingId(decisionId)
        try {
            const res = await updateMonevArahanAction(
                agenda.id,
                decisionId,
                form
            )
            if (res.success) {
                // ✅ Toast Konsisten dengan Agenda Radir
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg min-w-87.5 animate-in slide-in-from-bottom-5">
                        <div className="shrink-0">
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Progress Berhasil Disimpan</h4>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                                Data Monev Telah Diperbarui
                            </p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ), { duration: 4000 })
            }
            else {
                toast.error(res.error)
            }
        } catch {
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
            <DialogContent className="w-full max-w-full h-full sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl p-0 bg-white shadow-2xl border-0 sm:border">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 z-50 h-10 w-10 rounded-full hover:bg-white/20 text-white hover:text-white transition-colors"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-5 w-5" />
                </Button>

                <DialogHeader className="bg-[#125d72] text-white p-6 sm:p-8 sticky top-0 z-20 shadow-md">
                    <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-3 tracking-tight">
                        <FileText className="h-6 w-6 text-[#efe62f]" />
                        UPDATE TINDAK LANJUT RAKORDIR
                    </DialogTitle>
                    <DialogDescription className="text-[#e7f6f9]/90 mt-2 font-medium">
                        Agenda: <span className="font-bold text-white uppercase tracking-wide">{agenda.title}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="p-5 sm:p-8 space-y-8 bg-slate-50/50 min-h-100">
                    {arahans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <FileText className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">Tidak ada data arahan</h3>
                            <p className="text-slate-500 text-sm">Agenda ini belum memiliki butir arahan yang tercatat.</p>
                        </div>
                    ) : (
                        arahans.map((item: any, index: number) => (
                            <ArahanItemCard
                                key={item.id}
                                item={item}
                                index={index}
                                isLoading={loadingId === item.id}
                                onUpdate={(formData) =>
                                    handleUpdateItem(item.id, formData)
                                }
                                onOpenEvidence={handleOpenEvidence}
                            />
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

/* ============================
   ARAHAN ITEM CARD
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
    }

    const handleDeleteConfirm = () => {
        setIsExistingDeleted(true)
        setDeleteDialogOpen(false)
        toast.success("File evidence ditandai untuk dihapus")
    }

    const isDone = status === "DONE"

    return (
        <>
            <Card className={`border transition-all duration-300 shadow-sm hover:shadow-md ${isDone ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                <CardContent className="p-0">
                    <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${isDone ? 'bg-emerald-50/50' : 'bg-white'}`}>
                        <div className="flex items-center gap-4 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isDone ? 'bg-emerald-600 text-white' : 'bg-[#125d72] text-white'}`}>
                                {index + 1}
                            </div>
                            <p className="font-bold text-slate-800 text-sm md:text-base leading-snug line-clamp-2">{item.text}</p>
                        </div>
                        {isDone ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none px-3 py-1 text-xs font-bold uppercase tracking-wide">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Selesai
                            </Badge>
                        ) : (
                            <Badge className="text-slate-500 border-slate-300 bg-white">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> In Progress
                            </Badge>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 bg-white space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide">Target Output</Label>
                                <Input
                                    value={output}
                                    onChange={(e) => setOutput(e.target.value)}
                                    placeholder="Contoh: Dokumen SK Terbit"
                                    className="h-11 border-slate-200 focus:border-[#14a2ba] focus:ring-[#14a2ba]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide">Progress Terkini</Label>
                                <Input
                                    value={progress}
                                    onChange={(e) => setProgress(e.target.value)}
                                    placeholder="Update status pengerjaan..."
                                    className="h-11 border-slate-200 focus:border-[#14a2ba] focus:ring-[#14a2ba]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide">Evidence (Bukti Dukung)</Label>
                            {item.evidencePath && !isExistingDeleted ? (
                                <div className="flex items-center justify-between p-3 border border-blue-100 bg-blue-50/50 rounded-lg group hover:border-blue-300 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => onOpenEvidence(item.evidencePath)}
                                        className="flex items-center gap-3 text-blue-700 font-semibold text-sm hover:underline"
                                    >
                                        <div className="h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center text-blue-600">
                                            <FileCheck className="h-5 w-5" />
                                        </div>
                                        Lihat File Evidence
                                    </button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
                                        onClick={() => setDeleteDialogOpen(true)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="h-11 border-slate-200 bg-slate-50/50 file:bg-[#125d72] file:text-white file:border-none file:rounded-md file:mr-4 file:px-3 file:text-xs file:font-bold file:uppercase cursor-pointer hover:bg-slate-50 focus:border-[#14a2ba]"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    {file && (
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row items-end gap-4 pt-2 border-t border-slate-100 mt-4">
                            <div className="w-full md:w-1/2 space-y-2">
                                <Label className="text-xs font-bold text-[#125d72] uppercase tracking-wide">Status Penyelesaian</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-11 border-slate-200 font-medium">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ON_PROGRESS">
                                            <div className="flex items-center gap-2 text-amber-600 font-bold">
                                                <AlertCircle className="h-4 w-4" /> In Progress
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="DONE">
                                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                                <CheckCircle2 className="h-4 w-4" /> Selesai (Done)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className={`h-11 px-6 w-full md:w-auto font-bold uppercase tracking-wider shadow-lg transition-all ${isLoading ? 'bg-slate-300 text-slate-500' : 'bg-[#125d72] hover:bg-[#0e4b5c] text-white'}`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Simpan Update
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2 font-bold">
                            <AlertCircle className="h-5 w-5" /> Hapus Evidence?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 font-medium">
                            File bukti fisik akan dihapus permanen saat Anda menyimpan perubahan ini.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-bold text-slate-500">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}