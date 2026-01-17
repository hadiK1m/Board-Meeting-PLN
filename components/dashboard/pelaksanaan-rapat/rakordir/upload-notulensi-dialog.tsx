"use client"

import { useState } from "react"
import { FileUp, Loader2, FileText, CheckCircle2, X, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
// Pastikan Anda sudah membuat action ini di langkah sebelumnya
import { uploadRisalahRakordirAction } from "@/server/actions/rakordir-actions"

interface Props {
    agendaId: string | null        // ✅ Diubah: Menerima ID string
    meetingNumber: string | null   // ✅ Diubah: Menerima Nomor Rapat untuk display
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UploadNotulensiDialog({ agendaId, meetingNumber, open, onOpenChange }: Props) {
    const [file, setFile] = useState<File | null>(null)
    const [isPending, setIsPending] = useState(false)

    // Jika agendaId null, jangan render konten (prevents error)
    if (!agendaId) return null

    const handleUpload = async () => {
        if (!file) {
            toast.error("Silakan pilih file PDF terlebih dahulu")
            return
        }

        setIsPending(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            // Panggil Server Action khusus Rakordir (Bulk Upload)
            // Action ini akan mencari agenda berdasarkan ID, lalu mengupdate 
            // semua agenda lain dengan meetingNumber yang sama.
            const res = await uploadRisalahRakordirAction(agendaId, formData)

            if (res.success) {
                toast.success("Notulensi Final Berhasil Diunggah!", {
                    description: "File telah tertaut ke semua agenda dalam sesi ini."
                })
                onOpenChange(false)
                setFile(null)
            } else {
                toast.error(res.error || "Gagal mengunggah berkas")
            }
        } catch (err) {
            console.error("Upload error:", err)
            toast.error("Terjadi kesalahan saat mengunggah")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-112.5 border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#125d72] mb-1 font-black uppercase tracking-tight">
                        <FileUp className="h-5 w-5 text-[#14a2ba]" />
                        Upload Notulensi Final
                    </DialogTitle>

                    <DialogDescription className="text-xs font-medium italic">
                        Unggah berkas risalah rapat (PDF) yang telah ditandatangani untuk: <br />
                        <span className="font-bold text-slate-800 not-italic uppercase block mt-1">
                            Sesi Rapat Rakordir #{meetingNumber || "-"}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                            File Notulensi (PDF)
                        </Label>

                        <div className={cn(
                            "relative border-2 border-dashed rounded-2xl transition-all duration-300 min-h-40 flex items-center justify-center",
                            file ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 bg-slate-50/50 hover:border-[#14a2ba]"
                        )}>
                            <Input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />

                            <div className="py-12 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                                {!file ? (
                                    <>
                                        <FileText className="h-10 w-10 text-slate-300 mb-2" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                            Klik atau seret file PDF ke sini
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95">
                                        <div className="bg-emerald-500 p-3 rounded-full shadow-lg shadow-emerald-100 mb-3">
                                            <CheckCircle2 className="h-6 w-6 text-white" />
                                        </div>
                                        <p className="text-xs font-black text-emerald-700 truncate max-w-62.5 mb-1">
                                            {file.name}
                                        </p>
                                        <p className="text-[10px] text-emerald-600/70 font-bold uppercase">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                )}
                            </div>

                            {file && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full bg-white shadow-sm hover:bg-red-50 hover:text-red-500"
                                    onClick={() => setFile(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t pt-6">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="font-bold text-slate-400"
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={isPending || !file}
                        className="bg-[#125d72] hover:bg-[#0a3d4a] text-white font-extrabold px-6"
                    >
                        {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Simpan Notulensi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}