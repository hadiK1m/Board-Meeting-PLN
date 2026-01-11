"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { uploadRisalahTtdAction } from "@/server/actions/radir-actions"
import { Loader2, Upload } from "lucide-react"

interface UploadRisalahDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agendaId: string
    title: string
}

export function UploadRisalahDialog({ open, onOpenChange, agendaId, title }: UploadRisalahDialogProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    async function handleUpload() {
        if (!file || !agendaId) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", file)

        const result = await uploadRisalahTtdAction(agendaId, formData)

        if (result.success) {
            toast.success("Berhasil", { description: "Risalah Final berhasil diunggah ke agenda-attachments." })
            onOpenChange(false)
            setFile(null)
        } else {
            toast.error("Gagal", { description: result.error })
        }
        setIsUploading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Risalah Final (TTD)</DialogTitle>
                    <DialogDescription>
                        Unggah dokumen PDF Risalah yang sudah ditandatangani untuk:<br />
                        <span className="font-semibold text-slate-900">{title}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="file-upload">Pilih File PDF</Label>
                        <Input
                            id="file-upload"
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                        Batal
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" /> Upload
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}