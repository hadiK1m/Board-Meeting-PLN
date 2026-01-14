/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Loader2, AlertCircle } from "lucide-react"
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
// Impor action yang sudah kita buat tadi
import { postponeAgendaAction } from "@/server/actions/agenda-actions"

interface PostponeAgendaDialogProps {
    agendaId: string
    agendaTitle: string
}

export function PostponeAgendaDialog({ agendaId, agendaTitle }: PostponeAgendaDialogProps) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState("")
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handlePostpone = async () => {
        if (!reason.trim() || reason.length < 5) {
            toast.error("Alasan penundaan minimal 5 karakter")
            return
        }

        setIsPending(true)
        try {
            const result = await postponeAgendaAction({
                id: agendaId,
                reason: reason
            })

            if (result.success) {
                toast.success("Agenda berhasil ditunda")
                setOpen(false)
                setReason("")
                router.refresh()
            } else {
                toast.error(result.error || "Gagal menunda agenda")
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {/* Dibuat agar pas di dalam DropdownMenuItem */}
                <div className="flex items-center w-full px-2 py-1.5 text-sm font-bold text-amber-600 hover:bg-amber-50 rounded-md cursor-pointer transition-colors">
                    <Clock className="mr-3 h-4 w-4" /> Tunda Agenda
                </div>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md border-amber-100">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <DialogTitle className="uppercase font-black text-sm tracking-tight">Konfirmasi Penundaan</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs font-medium text-slate-500 italic">
                        Berikan alasan mengapa agenda ini perlu ditunda penayangannya: <br />
                        <span className="font-bold text-[#125d72] not-italic">&quot;{agendaTitle}&quot;</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Alasan Penundaan</label>
                    <Textarea
                        placeholder="Contoh: Menunggu kelengkapan dokumen pendukung atau arahan lebih lanjut..."
                        className="min-h-32 focus-visible:ring-amber-500 bg-slate-50 border-slate-200"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isPending}
                    />
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-xs font-bold uppercase">
                        Kembali
                    </Button>
                    <Button
                        onClick={handlePostpone}
                        disabled={isPending || reason.length < 5}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase px-6"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Penundaan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}