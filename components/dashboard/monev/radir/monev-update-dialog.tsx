"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react"
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

    // State Lokal
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Handler Update per Item
    const handleUpdateItem = async (decisionId: string, form: FormData) => {
        setLoadingId(decisionId)

        try {
            const res = await updateMonevDecisionAction(agenda.id, decisionId, form)
            if (res.success) {
                toast.success("Progress berhasil disimpan")
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setLoadingId(null)
        }
    }

    // Helper membuka evidence
    const handleOpenEvidence = async (path: string) => {
        const url = await getEvidenceUrlAction(path)
        if (url) window.open(url, "_blank")
        else toast.error("Gagal membuka file")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Update Progress Tindak Lanjut</DialogTitle>
                    <DialogDescription>
                        Agenda: <span className="font-semibold text-slate-900">{agenda.title}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {decisions.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed">
                            <p className="text-slate-500">Tidak ada butir keputusan yang tercatat.</p>
                        </div>
                    ) : (
                        decisions.map((item, index) => (
                            <DecisionItemCard
                                key={item.id || index}
                                item={item}
                                index={index}
                                isLoading={loadingId === item.id}
                                onUpdate={(formData) => handleUpdateItem(item.id, formData)}
                                onOpenEvidence={handleOpenEvidence}
                            />
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Sub-Component untuk Kartu per Item Keputusan
function DecisionItemCard({
    item,
    index,
    isLoading,
    onUpdate,
    onOpenEvidence
}: {
    item: MonevDecisionItem,
    index: number,
    isLoading: boolean,
    onUpdate: (fd: FormData) => void,
    onOpenEvidence: (path: string) => void
}) {
    // Local state form agar responsive saat diketik
    const [output, setOutput] = useState(item.targetOutput || "")
    const [progress, setProgress] = useState(item.currentProgress || "")
    const [status, setStatus] = useState(item.status || "ON_PROGRESS")
    const [file, setFile] = useState<File | null>(null)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append("targetOutput", output)
        formData.append("currentProgress", progress)
        formData.append("status", status)
        if (file) formData.append("evidenceFile", file)

        onUpdate(formData)
        setFile(null) // Reset file input visual
    }

    return (
        <Card className={`border ${status === 'DONE' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
            <CardContent className="p-5 space-y-4">
                {/* Header Item */}
                <div className="flex gap-3 items-start">
                    <div className="flex-none bg-slate-100 text-slate-600 font-bold w-8 h-8 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-100 shadow-sm mb-3">
                            {item.text}
                        </p>

                        {/* Form Update */}
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Target Output</Label>
                                <Input
                                    value={output}
                                    onChange={(e) => setOutput(e.target.value)}
                                    placeholder="Contoh: Dokumen SK Terbit"
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Progress Terkini</Label>
                                <Input
                                    value={progress}
                                    onChange={(e) => setProgress(e.target.value)}
                                    placeholder="Update status..."
                                    className="bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Evidence (Bukti)</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="file"
                                        className="text-xs bg-white cursor-pointer"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    {item.evidencePath && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0 text-blue-600 border-blue-200 bg-blue-50"
                                            title="Lihat Bukti Tersimpan"
                                            onClick={() => onOpenEvidence(item.evidencePath!)}
                                        >
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Status Penyelesaian</Label>
                                <div className="flex gap-2">
                                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                        <SelectTrigger className={`bg-white ${status === 'DONE' ? 'text-emerald-600 border-emerald-200' : 'text-amber-600 border-amber-200'}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ON_PROGRESS">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-500" /> On Progress
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="DONE">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Selesai
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button type="submit" disabled={isLoading} className="w-24 shrink-0 bg-[#125d72] hover:bg-[#0e4b5c]">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}