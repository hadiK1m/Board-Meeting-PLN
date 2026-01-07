"use client"

import { useState, useEffect } from "react"
import { FileEdit, Loader2, X, FileText, Paperclip, User, } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
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

interface AgendaEdit {
    id: string
    title: string
    director?: string | null
    initiator?: string | null
    contactPerson?: string | null
    position?: string | null
    phone?: string | null
    kepdirSirkulerDoc?: string | null
    grcDoc?: string | null
    supportingDocuments?: string | null | any[]
    status?: string | null
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
    multiValue: (base) => ({
        ...base,
        backgroundColor: "#e7f6f9",
        borderRadius: "0.25rem",
        border: "1px solid #14a2ba",
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: "#125d72",
        fontWeight: "600",
        padding: "2px 6px",
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: "#125d72",
        "&:hover": { backgroundColor: "#14a2ba", color: "white" },
    }),
};

export function EditKepdirModal({ data: agenda, isOpen: open, onOpenChange }: { data: AgendaEdit | null, isOpen: boolean, onOpenChange: (o: boolean) => void }) {
    const [isPending, setIsPending] = useState(false)
    const [selectedDir, setSelectedDir] = useState<Option[]>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<Option[]>([])
    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({})
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)

    useEffect(() => {
        if (agenda && open) {
            setSelectedDir((agenda.director ?? "").split(/,\s*/).filter(Boolean).map(d => ({ label: d, value: d })))
            setSelectedPemrakarsa((agenda.initiator ?? "").split(/,\s*/).filter(Boolean).map(i => ({ label: i, value: i })))

            setExistingFiles({
                kepdirSirkulerDoc: agenda.kepdirSirkulerDoc ?? null,
                grcDoc: agenda.grcDoc ?? null,
            })
        }
    }, [agenda, open])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)

        const formData = new FormData(event.currentTarget)
        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))

        try {
            // Logic Hapus File Lama jika user menekan tombol 'X' pada file yang sudah ada
            const fileFields = ['kepdirSirkulerDoc', 'grcDoc']
            for (const f of fileFields) {
                const originalPath = (agenda as any)[f]
                if (originalPath && existingFiles[f] === null) {
                    formData.append(`delete_${f}`, 'true')
                }
            }

            const result = await updateKepdirAction(agenda!.id, formData)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg min-w-87.5">
                        <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Kepdir Diperbarui</h4>
                            <p className="text-xs text-slate-500 italic uppercase">Perubahan berhasil disimpan ke sistem.</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))
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
            <DialogContent className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                        <FileEdit className="h-5 w-5 text-[#efe62f]" /> Ubah Usulan Kepdir Sirkuler
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
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Judul Keputusan Direksi</Label>
                                    <Input name="title" defaultValue={agenda.title} required placeholder="Masukkan judul keputusan..." className="h-11" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Direktur Pemrakarsa</Label>
                                        <Select isMulti styles={selectStyles} options={DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }))} value={selectedDir} onChange={v => setSelectedDir(v as Option[])} placeholder="Pilih Direktur..." />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Unit Pemrakarsa</Label>
                                        <Select isMulti styles={selectStyles} options={PEMRAKARSA.map(p => ({ label: p, value: p }))} value={selectedPemrakarsa} onChange={v => setSelectedPemrakarsa(v as Option[])} placeholder="Pilih Unit..." />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: NARAHUBUNG */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <User className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Data Narahubung</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Nama Narahubung</Label>
                                        <Input name="contactPerson" defaultValue={agenda.contactPerson ?? ""} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Jabatan</Label>
                                        <Input name="position" defaultValue={agenda.position ?? ""} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">No HP/WhatsApp</Label>
                                        <Input name="phone" defaultValue={agenda.phone ?? ""} required />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: DOKUMEN (Logic Hapus/Ganti File) */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Dokumen Lampiran (PDF)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { id: "kepdirSirkulerDoc", label: "1. Dokumen Kepdir Sirkuler" },
                                        { id: "grcDoc", label: "2. Dokumen GRC" },
                                    ].map((doc) => (
                                        <div key={doc.id} className="p-4 rounded-xl border-2 border-dashed bg-[#fcfcfc] border-slate-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="text-[10px] font-black text-[#125d72] uppercase">{doc.label}</Label>
                                            </div>

                                            {existingFiles[doc.id] ? (
                                                <div className="flex items-center justify-between p-2 border rounded bg-[#e7f6f9]/30 border-[#14a2ba]/30">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <FileText className="w-4 h-4 text-[#14a2ba]" />
                                                        <span className="text-[10px] font-bold text-[#125d72] truncate">{existingFiles[doc.id]!.split('/').pop()}</span>
                                                    </div>
                                                    <button type="button" onClick={() => setConfirmDeleteField(doc.id)} className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>

                                                    <AlertDialog open={confirmDeleteField === doc.id} onOpenChange={(open) => { if (!open) setConfirmDeleteField(null) }}>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Hapus dokumen?</AlertDialogTitle>
                                                                <AlertDialogDescription>Dokumen akan ditandai untuk dihapus. Anda harus menekan &quot;Simpan Perubahan&quot; untuk memproses penghapusan secara permanen.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={() => setConfirmDeleteField(null)}>Batal</AlertDialogCancel>
                                                                <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => { setExistingFiles(prev => ({ ...prev, [doc.id]: null })); setConfirmDeleteField(null); }}>Hapus Berkas</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            ) : (
                                                <Input name={doc.id} type="file" accept=".pdf" className="h-9 text-[10px] file:bg-[#14a2ba] file:text-white file:border-none file:rounded cursor-pointer" />
                                            )}
                                        </div>
                                    ))}

                                    <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 col-span-1 md:col-span-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">3. Tambahkan Dokumen Pendukung Lainnya (Opsi Baru)</Label>
                                        <Input name="supportingDocuments" type="file" multiple accept=".pdf" className="h-9 text-[10px] file:bg-slate-400 file:text-white file:border-none file:rounded cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending} className="font-bold text-slate-400 uppercase text-xs">Batal</Button>
                        <Button type="submit" disabled={isPending} className="bg-[#125d72] hover:bg-[#14a2ba] text-white font-black uppercase tracking-widest px-8 h-12 rounded-xl shadow-xl transition-all">
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}