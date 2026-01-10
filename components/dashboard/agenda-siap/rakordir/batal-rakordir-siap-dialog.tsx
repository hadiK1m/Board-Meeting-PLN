"use client"

import * as React from "react"
import { useState } from "react"
import { AlertTriangle, Loader2, XCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cancelAgendaAction } from "@/server/actions/agenda-actions"

interface AgendaData {
    id: string
    title: string
}

interface BatalRakordirSiapDialogProps {
    agenda: AgendaData | null
    open: boolean
    onOpenChange: (open: boolean) => void
    variant?: "default" | "dropdown"
}

export function BatalRakordirSiapDialog({
    agenda,
    open: externalOpen,
    onOpenChange: setExternalOpen,
    variant = "default"
}: BatalRakordirSiapDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [reason, setReason] = useState("")

    const isOpen = variant === "dropdown" ? externalOpen : internalOpen
    const onOpenChange = variant === "dropdown" ? setExternalOpen : setInternalOpen

    if (!agenda) return null

    async function handleCancel() {
        // Double check agenda untuk TypeScript safety
        if (!agenda) return;

        if (!reason || reason.trim().length < 5) {
            toast.error("Alasan pembatalan minimal 5 karakter")
            return
        }

        setIsPending(true)
        try {
            // FIX: Kirim sebagai objek sesuai kontrak Server Action umum
            const res = await cancelAgendaAction({
                id: agenda.id,
                reason: reason.trim()
            })

            if (res.success) {
                toast.success("Agenda Rakordir berhasil dibatalkan")
                setReason("")
                onOpenChange(false)
            } else {
                toast.error(res.error || "Gagal membatalkan agenda")
            }
        } catch (error) {
            console.error("Cancel Rakordir Error:", error)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {variant === "default" && (
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-md border-none shadow-2xl overflow-hidden p-0">
                <DialogHeader className="p-6 bg-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-50 rounded-full">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <DialogTitle className="text-[#125d72] font-black uppercase tracking-tight text-xl">
                            Batalkan Rakordir
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500 text-xs font-medium leading-relaxed">
                        Anda akan membatalkan agenda: <br />
                        <span className="font-bold text-slate-800 uppercase italic">
                            &quot;{agenda.title}&quot;
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-[10px] font-black text-[#125d72] uppercase tracking-widest flex items-center gap-2">
                            Alasan Pembatalan <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            placeholder="Contoh: Dokumen belum lengkap atau arahan untuk ditunda..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-24 focus-visible:ring-red-500 rounded-xl bg-slate-50 border-slate-200 text-sm italic"
                        />
                    </div>
                </div>

                <DialogFooter className="p-4 bg-slate-50 flex flex-row items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="font-bold text-slate-500 uppercase text-[10px] hover:bg-slate-200 rounded-xl"
                    >
                        Kembali
                    </Button>
                    <Button
                        onClick={handleCancel}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] px-6 rounded-xl shadow-lg shadow-red-100 transition-all active:scale-95"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Memproses
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                                Batalkan Agenda
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}