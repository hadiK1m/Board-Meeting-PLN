"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createManualMonevAction } from "@/server/actions/monev-radir-actions"
import { toast } from "sonner"
import { Loader2, Plus, AlertCircle, CheckCircle2 } from "lucide-react"

interface MonevAddDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function MonevAddDialog({ open, onOpenChange }: MonevAddDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState("ON_PROGRESS")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        // Tambahkan status manual dari state select karena select shadcn tidak native input
        formData.set("status", status)

        const res = await createManualMonevAction(formData)

        if (res.success) {
            toast.success("Berhasil", { description: res.message })
            onOpenChange(false)
        } else {
            toast.error("Gagal", { description: res.error })
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>Tambah Data Monev</DialogTitle>
                    <DialogDescription>
                        Tambahkan item monitoring baru secara manual.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="judul">Keputusan <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="judul"
                            name="judul"
                            placeholder="Masukan bunyi keputusan rapat..."
                            required
                            className="resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="output">Output</Label>
                            <Input id="output" name="output" placeholder="Contoh: Dokumen SK" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="progress">Progress Terakhir</Label>
                            <Input id="progress" name="progress" placeholder="Contoh: Review Legal" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="evidence">Dokumen Evidence</Label>
                        <Input
                            id="evidence"
                            name="evidenceFile"
                            type="file"
                            className="cursor-pointer bg-slate-50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Status Monev</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ON_PROGRESS">
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <AlertCircle className="h-4 w-4" /> In Progress
                                    </div>
                                </SelectItem>
                                <SelectItem value="DONE">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <CheckCircle2 className="h-4 w-4" /> Selesai
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-[#125d72] hover:bg-[#0e4b5c]">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Simpan Data
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}