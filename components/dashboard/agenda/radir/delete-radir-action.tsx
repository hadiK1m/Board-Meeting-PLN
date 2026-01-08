"use client"

import { useState } from "react"
import { Trash2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { deleteAgendaAction } from "@/server/actions/agenda-actions"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface DeleteActionProps {
    id: string
    title: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DeleteAction({ id, title, open, onOpenChange }: DeleteActionProps) {
    const [isPending, setIsPending] = useState(false)

    const onDelete = async () => {
        setIsPending(true)
        try {
            const result = await deleteAgendaAction(id)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-orange-500 p-4 shadow-2xl rounded-lg min-w-87.5">
                        <div className="shrink-0">
                            {/* PERBAIKAN DI SINI: dari /log-pln.png menjadi /logo-pln.png */}
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Data Dihapus</h4>
                            <p className="text-xs text-slate-500 italic uppercase truncate max-w-50">
                                Agenda &quot;{title}&quot; Berhasil dibersihkan.
                            </p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))
                onOpenChange(false)
            } else {
                toast.error(result.error)
            }
        } catch {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="border-none shadow-2xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full">
                            <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-[#125d72] font-bold text-xl">Konfirmasi Hapus</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-slate-600 mt-2">
                        Apakah Anda yakin ingin menghapus agenda <span className="font-bold text-red-600 italic">&quot;{title}&quot;</span>?
                        <br /><br />
                        Tindakan ini akan menghapus data di database dan <strong>seluruh file lampiran PDF</strong> di storage secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="bg-slate-50 p-4 -m-6 mt-4 flex gap-2">
                    <AlertDialogCancel className="border-slate-200">Batal</AlertDialogCancel>
                    <Button
                        onClick={onDelete}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold min-w-30"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isPending ? "Proses..." : "Ya, Hapus"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}