"use client"

import { useState, useEffect } from "react"
import {
    FileEdit, Loader2, X, FileText,
    Paperclip, ShieldCheck,
    FileSignature, User
} from "lucide-react"
import { toast } from "sonner"
// import Image from "next/image" // Dihapus karena tidak digunakan
import Select, { StylesConfig } from "react-select"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import { updateKepdirAction } from "@/server/actions/kepdir-actions"
import { DIREKTURE_PEMRAKARSA, PEMRAKARSA, extractCode } from "@/lib/MasterData"

// 1. DEFINISI TIPE DATA (Menggantikan 'any')
interface AgendaItem {
    id: string
    title: string
    director: string | null
    initiator: string | null
    contactPerson: string
    position: string
    phone: string
    kepdirSirkulerDoc?: string | null
    grcDoc?: string | null
}

interface KepdirEditProps {
    agenda: AgendaItem | null // Menggunakan tipe data yang jelas
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Option = { label: string; value: string }

const selectStyles: StylesConfig<Option, true> = {
    control: (base) => ({
        ...base,
        borderColor: "#d9d9d9",
        "&:hover": { borderColor: "#14a2ba" },
        boxShadow: "none",
        borderRadius: "0.375rem",
        fontSize: "0.875rem",
        minHeight: "44px",
    }),
};

export function EditKepdirModal({ agenda, open, onOpenChange }: KepdirEditProps) {
    const [isPending, setIsPending] = useState(false)
    const [selectedDir, setSelectedDir] = useState<Option[]>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<Option[]>([])

    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({})
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)

    // Sync Data saat Modal dibuka
    useEffect(() => {
        if (agenda && open) {
            setSelectedDir((agenda.director ?? "").split(/,\s*/).filter(Boolean).map((d: string) => ({ label: d, value: d })))
            setSelectedPemrakarsa((agenda.initiator ?? "").split(/,\s*/).filter(Boolean).map((i: string) => ({ label: i, value: i })))

            setExistingFiles({
                kepdirSirkulerDoc: agenda.kepdirSirkulerDoc ?? null,
                grcDoc: agenda.grcDoc ?? null,
            })
        }
    }, [agenda, open])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!agenda) return // Guard clause

        setIsPending(true)

        const formData = new FormData(event.currentTarget)
        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("meetingType", "KEPDIR_SIRKULER")

        // Logika penanda penghapusan file lama
        if (agenda.kepdirSirkulerDoc && existingFiles.kepdirSirkulerDoc === null) {
            formData.append("delete_kepdirSirkulerDoc", "true")
        }
        if (agenda.grcDoc && existingFiles.grcDoc === null) {
            formData.append("delete_grcDoc", "true")
        }

        try {
            const result = await updateKepdirAction(agenda.id, formData)
            if (result.success) {
                toast.success("Data Kepdir Sirkuler berhasil diperbarui")
                onOpenChange(false)
            } else {
                toast.error(result.error)
            }
        } catch {
            toast.error("Gagal terhubung ke server")
        } finally {
            setIsPending(false)
        }
    }

    if (!agenda) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-175 h-[90vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase">
                        <FileEdit className="h-5 w-5 text-[#efe62f]" /> Ubah Kepdir Sirkuler
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6 bg-white">
                        <div className="grid gap-10 pb-10">

                            {/* SECTION 1: INFORMASI UTAMA */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Informasi Utama</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72]">Judul Agenda Sirkuler</Label>
                                    <Input name="title" defaultValue={agenda.title} required placeholder="Masukkan judul sirkuler..." />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Direktur Pemrakarsa</Label>
                                        <Select
                                            isMulti
                                            options={DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }))}
                                            styles={selectStyles}
                                            value={selectedDir}
                                            onChange={(v) => setSelectedDir(v as Option[])}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Pemrakarsa</Label>
                                        <Select
                                            isMulti
                                            options={PEMRAKARSA.map(p => ({ label: p, value: p }))}
                                            styles={selectStyles}
                                            value={selectedPemrakarsa}
                                            onChange={(v) => setSelectedPemrakarsa(v as Option[])}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: NARAHUBUNG */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <User className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Narahubung</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Nama PIC</Label>
                                        <Input name="contactPerson" defaultValue={agenda.contactPerson} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Jabatan</Label>
                                        <Input name="position" defaultValue={agenda.position} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">No HP/WA</Label>
                                        <Input name="phone" defaultValue={agenda.phone} required />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: DOKUMEN */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Dokumen (PDF)</h3>
                                </div>
                                <div className="grid gap-4">
                                    {[
                                        { id: "kepdirSirkulerDoc", label: "Dokumen Kepdir Sirkuler", icon: FileSignature },
                                        { id: "grcDoc", label: "Dokumen GRC", icon: ShieldCheck },
                                    ].map((doc) => (
                                        <div key={doc.id} className="p-4 rounded-lg border bg-[#fcfcfc]">
                                            <Label className="text-[10px] font-black text-[#125d72] uppercase mb-2 block tracking-wider">
                                                {doc.label}
                                            </Label>

                                            {existingFiles[doc.id] ? (
                                                <div className="flex items-center justify-between p-2 border rounded bg-blue-50">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <doc.icon className="h-4 w-4 text-blue-500 shrink-0" />
                                                        <span className="text-xs truncate text-blue-700 font-medium">
                                                            {existingFiles[doc.id]?.split('/').pop()}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setConfirmDeleteField(doc.id)}
                                                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-100"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Input name={doc.id} type="file" accept=".pdf" className="h-9 text-[10px]" />
                                            )}
                                        </div>
                                    ))}

                                    <div className="p-4 rounded-lg border-2 border-dashed border-[#14a2ba] bg-white">
                                        <Label className="text-[10px] font-black text-[#14a2ba] uppercase mb-2 block italic">
                                            Dokumen Pendukung Lainnya (Opsional)
                                        </Label>
                                        <Input name="supportingDocuments" type="file" multiple accept=".pdf" className="h-9 text-[10px]" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
                        <Button type="submit" disabled={isPending} className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-bold px-8 shadow-lg">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>

            {/* Alert Konfirmasi Hapus File */}
            <AlertDialog open={!!confirmDeleteField} onOpenChange={() => setConfirmDeleteField(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus dokumen lama?</AlertDialogTitle>
                        <AlertDialogDescription>
                            File akan ditandai untuk dihapus dari storage. Anda harus mengunggah file baru atau menyimpan perubahan untuk memproses ini.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 text-white"
                            onClick={() => {
                                if (confirmDeleteField) setExistingFiles(prev => ({ ...prev, [confirmDeleteField]: null }))
                                setConfirmDeleteField(null)
                            }}
                        >
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    )
}