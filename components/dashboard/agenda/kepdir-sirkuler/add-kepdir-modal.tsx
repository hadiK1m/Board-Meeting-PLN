"use client"

import { useState, useEffect } from "react"
import { PlusCircle, FileText, Paperclip, Loader2, X, Send, User, Phone, Briefcase } from "lucide-react"
import { toast } from "sonner"
import Select, { MultiValue, StylesConfig } from "react-select"
import Image from "next/image"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import { createKepdirAction } from "@/server/actions/kepdir-actions"
import {
    DIREKTURE_PEMRAKARSA,
    PEMRAKARSA,
    extractCode
} from "@/lib/MasterData"

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

export function AddKepdirModal() {
    const [isClient, setIsClient] = useState(false)
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    // Form State
    const [judul, setJudul] = useState("")
    const [selectedDir, setSelectedDir] = useState<MultiValue<{ label: string, value: string }>>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<MultiValue<{ label: string, value: string }>>([])

    // File Status for Validation
    const [hasKepdirDoc, setHasKepdirDoc] = useState(false)
    const [hasGrcDoc, setHasGrcDoc] = useState(false)

    const dirOptions = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));
    const pemOptions = PEMRAKARSA.map(p => ({ label: p, value: p }));

    useEffect(() => {
        setIsClient(true)
    }, [])

    const resetForm = () => {
        setJudul(""); setSelectedDir([]); setSelectedPemrakarsa([]);
        setHasKepdirDoc(false); setHasGrcDoc(false);
    }

    // Dokumen Wajib: Kepdir & GRC
    const isComplete = hasKepdirDoc && hasGrcDoc && judul && selectedDir.length > 0 && selectedPemrakarsa.length > 0;

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        // Mapping Multi-Select to String format
        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("status", isComplete ? "Siap Sirkuler" : "Draft")

        try {
            const result = await createKepdirAction(formData)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg min-w-87.5">
                        <div className="shrink-0">
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Kepdir Berhasil Disimpan</h4>
                            <p className="text-xs text-slate-500 italic uppercase">Status: {isComplete ? "Siap Sirkuler" : "Draft"}</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))
                setOpen(false)
                resetForm()
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#14a2ba] hover:bg-[#125d72] text-white shadow-lg font-bold uppercase tracking-tighter">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Usulan Kepdir
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                        <FileText className="h-5 w-5 text-[#efe62f]" /> Form Usulan Kepdir Sirkuler
                    </DialogTitle>
                    <DialogDescription className="text-[#e7f6f9]/90 italic font-medium">
                        &quot;Pastikan Dokumen Kepdir dan GRC telah diunggah sesuai standar&quot;
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6 bg-white">
                        <div className="grid gap-10 pb-10">

                            {/* SECTION 1: INFORMASI UTAMA */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Informasi Agenda</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label htmlFor="title" className="font-bold text-[#125d72] uppercase text-[11px]">Judul Keputusan Direksi</Label>
                                    <Input id="title" name="title" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Masukkan judul keputusan..." required className="h-11" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Direktur Pemrakarsa</Label>
                                        <Select isMulti options={dirOptions} styles={selectStyles} value={selectedDir} onChange={setSelectedDir} placeholder="Pilih Direktur..." />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Unit Pemrakarsa</Label>
                                        <Select isMulti options={pemOptions} styles={selectStyles} value={selectedPemrakarsa} onChange={setSelectedPemrakarsa} placeholder="Pilih Unit..." />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: NARAHUBUNG */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <User className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Data Narahubung (PIC)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Nama Narahubung</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input name="contactPerson" className="pl-10" placeholder="Nama PIC" required />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Jabatan</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input name="position" className="pl-10" placeholder="Jabatan PIC" required />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">No HP/WhatsApp</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input name="phone" type="number" className="pl-10" placeholder="62812..." required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: BERKAS DOKUMEN */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Dokumen Lampiran (PDF)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`p-4 rounded-xl border-2 border-dashed transition-all ${hasKepdirDoc ? 'border-[#14a2ba] bg-[#e7f6f9]/20' : 'border-slate-200 bg-slate-50'}`}>
                                        <Label className="text-[10px] font-black text-[#125d72] uppercase mb-2 block">1. Dokumen Kepdir Sirkuler (Wajib)</Label>
                                        <Input
                                            name="kepdirSirkulerDoc"
                                            type="file"
                                            accept=".pdf"
                                            required
                                            onChange={(e) => setHasKepdirDoc(!!e.target.files?.[0])}
                                            className="h-10 text-[10px] file:bg-[#125d72] file:text-white file:border-none file:rounded file:px-3 cursor-pointer"
                                        />
                                    </div>
                                    <div className={`p-4 rounded-xl border-2 border-dashed transition-all ${hasGrcDoc ? 'border-[#14a2ba] bg-[#e7f6f9]/20' : 'border-slate-200 bg-slate-50'}`}>
                                        <Label className="text-[10px] font-black text-[#125d72] uppercase mb-2 block">2. Dokumen GRC (Wajib)</Label>
                                        <Input
                                            name="grcDoc"
                                            type="file"
                                            accept=".pdf"
                                            required
                                            onChange={(e) => setHasGrcDoc(!!e.target.files?.[0])}
                                            className="h-10 text-[10px] file:bg-[#125d72] file:text-white file:border-none file:rounded file:px-3 cursor-pointer"
                                        />
                                    </div>
                                    <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 col-span-1 md:col-span-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">3. Dokumen Pendukung Lainnya (Multi-File)</Label>
                                        <Input
                                            name="supportingDocuments"
                                            type="file"
                                            multiple
                                            accept=".pdf"
                                            className="h-10 text-[10px] file:bg-slate-400 file:text-white file:border-none file:rounded file:px-3 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-bold text-slate-400 uppercase text-xs">Batal</Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className={`h-12 px-10 font-black uppercase tracking-widest shadow-xl transition-all ${isComplete ? 'bg-[#125d72]' : 'bg-[#14a2ba]'} text-white rounded-xl`}
                        >
                            {isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                            ) : isComplete ? (
                                <><Send className="mr-2 h-4 w-4" /> Proses Sirkuler</>
                            ) : (
                                <><FileText className="mr-2 h-4 w-4" /> Simpan Draft</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}