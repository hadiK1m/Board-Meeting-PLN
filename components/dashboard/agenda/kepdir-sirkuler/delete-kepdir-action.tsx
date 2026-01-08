"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { deleteRadirAction } from "@/server/actions/radir-actions"
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
            // Menggunakan action yang sesuai untuk penghapusan
            const result = await deleteRadirAction(id)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-orange-500 p-4 shadow-2xl rounded-lg min-w-87.5">
                        <div className="shrink-0">
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Data Berhasil Dihapus</h4>
                            <p className="text-xs text-slate-500 italic line-clamp-1">{title}</p>
                        </div>
                        <button
                            onClick={() => toast.dismiss(t)}
                            className="text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))
                onOpenChange(false)
            } else {
                toast.error(result.error || "Gagal menghapus data")
            }
        } catch (error) {
            console.error("Delete Error:", error)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-100 border-none shadow-2xl p-6">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-red-100 rounded-full">
                            <Trash2 className="h-6 w-6 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-[#125d72] font-black uppercase tracking-tight text-xl">
                            Hapus Kepdir
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-slate-600 text-sm leading-relaxed">
                        Apakah Anda yakin ingin menghapus usulan <span className="font-bold text-red-600 italic">&quot;{title}&quot;</span>?
                        <br /><br />
                        Data di database dan seluruh lampiran file akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 flex gap-3">
                    <AlertDialogCancel
                        disabled={isPending}
                        className="flex-1 border-slate-200 text-slate-500 font-bold uppercase text-xs h-11"
                    >
                        Batal
                    </AlertDialogCancel>
                    <Button
                        onClick={onDelete}
                        disabled={isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs h-11 shadow-lg shadow-red-100"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Memproses...
                            </>
                        ) : (
                            "Ya, Hapus"
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}