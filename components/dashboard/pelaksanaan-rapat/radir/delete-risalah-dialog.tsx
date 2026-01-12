"use client"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteRisalahTtdAction } from "@/server/actions/radir-actions"
import { toast } from "sonner"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface DeleteRisalahDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agendaId: string
    filePath: string
}

export function DeleteRisalahDialog({ open, onOpenChange, agendaId, filePath }: DeleteRisalahDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleDelete() {
        setIsDeleting(true)
        const result = await deleteRisalahTtdAction(agendaId, filePath)

        if (result.success) {
            toast.success("Risalah berhasil dihapus")
            onOpenChange(false)
        } else {
            toast.error("Gagal menghapus risalah", { description: result.error })
        }
        setIsDeleting(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Risalah Final?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Anda yakin ingin menghapus file Risalah yang sudah di-upload?
                        Tindakan ini akan menghapus file dari penyimpanan secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleDelete()
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}