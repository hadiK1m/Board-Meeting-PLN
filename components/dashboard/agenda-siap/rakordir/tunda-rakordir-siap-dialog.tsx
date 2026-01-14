/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { postponeAgendaAction } from "@/server/actions/agenda-actions"
import { type AgendaReady } from "./rakordir-siap-client"

interface TundaRakordirSiapDialogProps {
    agenda: AgendaReady | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TundaRakordirSiapDialog({ agenda, open, onOpenChange }: TundaRakordirSiapDialogProps) {
    const [reason, setReason] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!agenda?.id) return

        if (reason.length < 5) {
            toast.error("Alasan penundaan minimal 5 karakter")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await postponeAgendaAction({
                id: agenda.id,
                reason: reason
            })

            if (result.success) {
                toast.success("Agenda berhasil ditunda")
                setReason("")
                onOpenChange(false)
            } else {
                toast.error(result.error || "Gagal menunda agenda")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-[#125d72] font-black uppercase text-sm">
                        Tunda Agenda
                    </DialogTitle>
                    <DialogDescription className="text-xs italic">
                        Anda akan menunda agenda: <span className="font-bold not-italic">{agenda?.title}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Label className="text-xs font-bold text-[#125d72] uppercase">Alasan Penundaan *</Label>
                    <Textarea
                        placeholder="Contoh: Agenda ditunda karena belum lengkapnya dokumen pendukung..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-24 text-sm"
                    />
                    <p className="text-[10px] text-slate-500 italic">
                        * Alasan minimal 5 karakter. Alasan ini akan tersimpan di database.
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="text-xs"
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || reason.length < 5}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                    >
                        {isSubmitting ? "Memproses..." : "Tunda Agenda"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}