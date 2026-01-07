"use client"

import { useState, useEffect } from "react"
import {
    PlusCircle, FileText, Paperclip, Loader2,
    ShieldCheck, FileSignature, User,

} from "lucide-react"
import { toast } from "sonner"
import Select, { MultiValue, StylesConfig } from "react-select"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import { createKepdirAction } from "@/server/actions/kepdir-actions"
import { DIREKTURE_PEMRAKARSA, PEMRAKARSA, extractCode } from "@/lib/MasterData"

const selectStyles: StylesConfig<{ label: string; value: string }, true> = {
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

export function AddKepdirModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
    const [isClient, setIsClient] = useState(false)
    const [isPending, setIsPending] = useState(false)

    const [selectedDir, setSelectedDir] = useState<MultiValue<{ label: string, value: string }>>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<MultiValue<{ label: string, value: string }>>([])

    useEffect(() => {
        setIsClient(true)
    }, [])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        // Mapping Multi-select ke string CSV
        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("meetingType", "KEPDIR_SIRKULER")

        try {
            const result = await createKepdirAction(formData)
            if (result.success) {
                toast.success("Agenda Kepdir Sirkuler berhasil disimpan")
                onOpenChange(false)
                event.currentTarget.reset()
                setSelectedDir([])
                setSelectedPemrakarsa([])
            } else {
                toast.error(result.error)
            }
        } catch {
            toast.error("Gagal terhubung ke server")
        } finally {
            setIsPending(false)
        }
    }

    if (!isClient) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-187.5 h-[90vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <PlusCircle className="h-5 w-5 text-[#efe62f]" /> Form Kepdir Sirkuler
                    </DialogTitle>
                    <DialogDescription className="text-[#e7f6f9]/90 italic">
                        Input data usulan keputusan direksi melalui mekanisme sirkuler.
                    </DialogDescription>
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
                                    <Input name="title" placeholder="Masukkan judul sirkuler..." required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Direktur Pemrakarsa</Label>
                                        <Select
                                            isMulti
                                            options={DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }))}
                                            styles={selectStyles}
                                            value={selectedDir}
                                            onChange={setSelectedDir}
                                            placeholder="Pilih Direktur..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Pemrakarsa</Label>
                                        <Select
                                            isMulti
                                            options={PEMRAKARSA.map(p => ({ label: p, value: p }))}
                                            styles={selectStyles}
                                            value={selectedPemrakarsa}
                                            onChange={setSelectedPemrakarsa}
                                            placeholder="Pilih Unit..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: NARAHUBUNG */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <User className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Narahubung PIC</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Nama Narahubung</Label>
                                        <Input name="contactPerson" placeholder="Nama Lengkap" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Jabatan</Label>
                                        <Input name="position" placeholder="Jabatan PIC" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">No HP/WhatsApp</Label>
                                        <Input name="phone" type="number" placeholder="62812..." required />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: LAMPIRAN KHUSUS */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Lampiran Dokumen (PDF)</h3>
                                </div>
                                <div className="grid gap-4">
                                    {/* Slot 1: Kepdir Sirkuler */}
                                    <div className="p-4 rounded-lg border bg-[#fcfcfc] hover:bg-blue-50/30 transition-all border-l-4 border-l-blue-500">
                                        <Label className="flex items-center gap-2 text-[10px] font-black text-[#125d72] uppercase mb-2">
                                            <FileSignature className="h-3 w-3 text-blue-500" /> Dokumen Kepdir Sirkuler
                                        </Label>
                                        <Input name="kepdirSirkulerDoc" type="file" accept=".pdf" className="h-9 text-[10px]" required />
                                    </div>

                                    {/* Slot 2: GRC Doc */}
                                    <div className="p-4 rounded-lg border bg-[#fcfcfc] hover:bg-emerald-50/30 transition-all border-l-4 border-l-emerald-500">
                                        <Label className="flex items-center gap-2 text-[10px] font-black text-[#125d72] uppercase mb-2">
                                            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Dokumen GRC
                                        </Label>
                                        <Input name="grcDoc" type="file" accept=".pdf" className="h-9 text-[10px]" required />
                                    </div>

                                    {/* Slot 3: Pendukung */}
                                    <div className="p-4 rounded-lg border-2 border-dashed border-slate-200 bg-white">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">
                                            Dokumen Pendukung Lainnya (Multi-File)
                                        </Label>
                                        <Input name="supportingDocuments" type="file" multiple accept=".pdf" className="h-9 text-[10px]" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-slate-50 border-t shrink-0 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
                        <Button type="submit" disabled={isPending} className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-bold px-8 shadow-lg">
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan Agenda Sirkuler"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}