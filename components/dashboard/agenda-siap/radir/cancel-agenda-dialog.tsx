"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cancelAgendaAction } from "@/server/actions/agenda-actions"

// ✅ Perbaikan: Tambahkan variant ke dalam interface
interface CancelAgendaDialogProps {
    agendaId: string
    agendaTitle: string
    variant?: "default" | "dropdown"
}

export function CancelAgendaDialog({ agendaId, agendaTitle, variant = "default" }: CancelAgendaDialogProps) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState("")
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleCancel = async () => {
        if (!reason.trim() || reason.length < 5) {
            toast.error("Alasan pembatalan minimal 5 karakter")
            return
        }

        setIsPending(true)
        try {
            const result = await cancelAgendaAction({
                id: agendaId,
                reason: reason
            })

            if (result.success) {
                toast.success("Agenda berhasil dibatalkan")
                setOpen(false)
                setReason("")
                router.refresh()
            } else {
                toast.error(result.error || "Gagal membatalkan agenda")
            }
        } catch (err) {
            console.error("Cancel Action Error:", err)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {variant === "dropdown" ? (
                    <div className="flex items-center px-2 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors w-full">
                        <Ban className="mr-3 h-4 w-4" /> Batalkan Agenda
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-white hover:bg-red-600 border-red-200 gap-2 transition-all"
                    >
                        <Ban className="h-4 w-4" /> Batalkan
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>Konfirmasi Pembatalan</DialogTitle>
                    </div>
                    <DialogDescription>
                        Apakah Anda yakin ingin membatalkan agenda <span className="font-bold text-slate-900">&quot;{agendaTitle}&quot;</span>?
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#125d72]">
                            Alasan Pembatalan
                        </label>
                        <Textarea
                            placeholder="Contoh: Arahan Direksi atau perubahan jadwal mendadak..."
                            className="min-h-30 focus-visible:ring-[#14a2ba]"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isPending}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Kembali
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isPending || reason.length < 5}
                        className="min-w-30"
                    >
                        {isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Proses...</>
                        ) : "Batalkan Agenda"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}