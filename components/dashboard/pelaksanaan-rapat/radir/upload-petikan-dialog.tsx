// components/dashboard/pelaksanaan-rapat/radir/upload-petikan-dialog.tsx
"use client"

import { useState } from "react"
import { FileUp, Loader2, FileText, CheckCircle2, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { uploadAgendaFileAction } from "@/server/actions/agenda-actions"

interface Props {
    agenda: { id: string; title: string } | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UploadPetikanDialog({ agenda, open, onOpenChange }: Props) {
    const [file, setFile] = useState<File | null>(null)
    const [isPending, setIsPending] = useState(false)

    if (!agenda) return null

    const handleUpload = async () => {
        if (!file) return toast.error("Pilih file PDF")

        // Validasi file
        if (file.type !== "application/pdf") {
            toast.error("Hanya file PDF yang diperbolehkan")
            return
        }

        if (file.size > 50 * 1024 * 1024) {
            toast.error("Ukuran file maksimal 50MB")
            return
        }

        setIsPending(true)
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("agendaId", agenda.id)
            formData.append("fileType", "petikanRisalah") // ✅ PASTIKAN INI "petikanRisalah"

            const res = await uploadAgendaFileAction(formData)
            if (res.success) {
                toast.success("Petikan Risalah berhasil diunggah")
                onOpenChange(false)
                setFile(null)
                // Refresh halaman untuk update data
                window.location.reload()
            } else {
                toast.error(res.error || "Gagal mengunggah petikan risalah")
            }
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("Terjadi kesalahan saat mengunggah")
        } finally {
            setIsPending(false)
        }
    }

    const handleRemoveFile = () => {
        setFile(null)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        // Validasi
        if (selectedFile.type !== "application/pdf") {
            toast.error("Hanya file PDF yang diperbolehkan")
            return
        }

        if (selectedFile.size > 50 * 1024 * 1024) {
            toast.error("Ukuran file maksimal 50MB")
            return
        }

        setFile(selectedFile)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#125d72] font-black uppercase">
                        <FileUp className="h-5 w-5 text-amber-500" /> Upload Petikan Risalah
                    </DialogTitle>
                    <DialogDescription className="text-xs italic">
                        Sesi: {agenda.title}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className={cn(
                        "relative border-2 border-dashed rounded-xl p-8 flex items-center justify-center transition-all",
                        file ? "border-amber-500 bg-amber-50/30" : "border-slate-200 bg-slate-50/50 hover:border-amber-500"
                    )}>
                        <Input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />

                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-10 w-10 text-amber-500" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium truncate max-w-50">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-slate-500 hover:text-red-600"
                                        onClick={handleRemoveFile}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center pointer-events-none">
                                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                                <p className="text-xs font-bold text-slate-500">Klik untuk memilih file PDF</p>
                                <p className="text-[10px] text-slate-400 mt-1">Maksimal 50MB</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setFile(null)
                            onOpenChange(false)
                        }}
                        disabled={isPending}
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={isPending || !file}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Mengupload...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Simpan Petikan
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}