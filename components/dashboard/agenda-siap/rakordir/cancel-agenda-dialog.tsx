"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cancelAgendaAction } from "@/server/actions/agenda-actions"

// ✅ FIX: Definisikan tipe data spesifik menggantikan 'any'
interface AgendaData {
    id: string
    title: string
}

interface CancelAgendaDialogProps {
    agenda: AgendaData | null
    open: boolean
    onOpenChange: (open: boolean) => void
    variant?: "default" | "dropdown" // Opsional jika ada varian trigger
}

export function CancelAgendaDialog({ agenda, open, onOpenChange }: CancelAgendaDialogProps) {
    const [isPending, setIsPending] = useState(false)
    const [reason, setReason] = useState("")

    if (!agenda) return null

    async function handleCancel() {
        if (!reason || reason.length < 5) {
            toast.error("Alasan pembatalan minimal 5 karakter")
            return
        }

        setIsPending(true)
        try {
            const result = await cancelAgendaAction({
                id: agenda!.id, // Non-null assertion aman karena ada check di atas
                reason: reason
            })

            if (result.success) {
                toast.success("Agenda berhasil dibatalkan")
                setReason("")
                onOpenChange(false)
            } else {
                toast.error(result.error || "Gagal membatalkan agenda")
            }
        } catch {
            // ✅ FIX: Hapus variabel 'error' yang tidak digunakan
            toast.error("Terjadi kesalahan koneksi")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* ✅ FIX: Gunakan canonical class 'sm:max-w-106.25' (atau 'sm:max-w-md' untuk standar 28rem/448px) */}
            <DialogContent className="sm:max-w-106.25 p-0 border-none shadow-2xl overflow-hidden bg-white">
                <DialogHeader className="p-6 bg-red-600 text-white">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-[#efe62f]" /> Batalkan Usulan Agenda
                    </DialogTitle>
                    <DialogDescription className="text-red-100 italic">
                        Tindakan ini akan memindahkan agenda ke daftar pembatalan.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-md">
                        <p className="text-xs font-bold text-red-700 uppercase">Agenda:</p>
                        <p className="text-sm text-slate-700 mt-1 font-medium">{agenda.title}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason" className="font-bold text-slate-700">
                            Alasan Pembatalan <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            placeholder="Contoh: Dokumen belum lengkap atau arahan pimpinan untuk ditunda..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            // ✅ FIX: Gunakan canonical class 'min-h-25' (25 * 4 = 100px)
                            className="min-h-25 focus:ring-red-500"
                        />
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 flex items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Kembali
                    </Button>
                    <Button
                        onClick={handleCancel}
                        disabled={isPending}
                        // ✅ FIX: Gunakan canonical class 'min-w-35' (35 * 4 = 140px)
                        className="bg-red-600 hover:bg-red-700 text-white font-bold min-w-35"
                    >
                        {isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                        ) : (
                            <><XCircle className="mr-2 h-4 w-4" /> Batalkan Agenda</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}