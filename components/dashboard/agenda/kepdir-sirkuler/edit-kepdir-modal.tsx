"use client"

import React, { useState, useEffect } from "react"
import {
    FileEdit,
    FileText,
    Paperclip,
    Loader2,
    X,
    Save,
    User,
    Phone,
    Briefcase,
    EyeOff,
    Eye,
    AlertCircle,
    Building2
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

import { updateKepdirAction } from "@/server/actions/kepdir-actions"
import { Agenda } from "@/db/schema/agendas"
import {
    DIREKTURE_PEMRAKARSA,
    PEMRAKARSA,
    extractCode
} from "@/lib/MasterData"

interface Option {
    label: string;
    value: string;
}

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

interface EditKepdirModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    data: Agenda;
}

export function EditKepdirModal({ isOpen, onOpenChange, data }: EditKepdirModalProps) {
    const [isPending, setIsPending] = useState(false)

    // Form States
    const [selectedDir, setSelectedDir] = useState<MultiValue<Option>>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<MultiValue<Option>>([])
    const [notRequiredFiles, setNotRequiredFiles] = useState<string[]>([])

    // File Management States
    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({})
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)

    const dirOptions = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));
    const pemOptions = PEMRAKARSA.map(p => ({ label: p, value: p }));

    // ✅ Sync Data Awal (Tampilkan data saat ini)
    useEffect(() => {
        if (data && isOpen) {
            // Mapping Direktur & Pemrakarsa
            const currentDirs = data.director
                ? data.director.split(", ").map(d => ({ label: d, value: d }))
                : [];
            const currentPems = data.initiator
                ? data.initiator.split(", ").map(p => ({ label: p, value: p }))
                : [];

            setSelectedDir(currentDirs);
            setSelectedPemrakarsa(currentPems);

            // Sync File yang sudah ada di database
            setExistingFiles({
                kepdirSirkulerDoc: data.kepdirSirkulerDoc ?? null,
                grcDoc: data.grcDoc ?? null,
            });

            // Parse Not Required Files dari DB
            if (data.notRequiredFiles) {
                try {
                    const parsed = typeof data.notRequiredFiles === 'string'
                        ? JSON.parse(data.notRequiredFiles)
                        : data.notRequiredFiles;
                    setNotRequiredFiles(Array.isArray(parsed) ? parsed : []);
                } catch {
                    setNotRequiredFiles([]);
                }
            }
        }
    }, [data, isOpen]);

    const toggleNotRequired = (fieldId: string) => {
        setNotRequiredFiles(prev =>
            prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
        )
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        // Set Multi-Select values
        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("notRequiredFiles", JSON.stringify(notRequiredFiles))

        // Handle Logic Penghapusan File Lama
        const fileFields: (keyof Agenda)[] = ['kepdirSirkulerDoc', 'grcDoc'];
        fileFields.forEach(f => {
            const originalPath = data[f];
            if (typeof originalPath === 'string' && existingFiles[f as string] === null) {
                formData.append(`delete_${f as string}`, 'true');
            }
        });

        try {
            const result = await updateKepdirAction(data.id, formData)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg">
                        <Image src="/logo-pln.png" alt="PLN" width={35} height={35} />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Berhasil Diperbarui</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Data usulan kepdir telah diperbarui.</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)}><X className="h-4 w-4 text-slate-300 hover:text-red-500" /></button>
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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                                <FileEdit className="h-5 w-5 text-[#efe62f]" /> Ubah Usulan Kepdir Sirkuler
                            </DialogTitle>
                            <DialogDescription className="text-[#e7f6f9]/90 italic font-medium">
                                Agenda ID: <span className="text-white font-bold not-italic">{data.id.slice(0, 8)}</span>
                            </DialogDescription>
                        </div>
                        <Badge className="bg-[#14a2ba] text-white border-none uppercase text-[10px] px-3 shadow-inner mr-5">Edit Mode</Badge>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6 bg-white">
                        <div className="grid gap-10 pb-10">

                            {/* SECTION 1: INFORMASI AGENDA */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Informasi Agenda</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Judul Keputusan Direksi</Label>
                                    <Input name="title" defaultValue={data.title} required className="h-11 border-slate-200 focus:border-[#14a2ba]" />
                                </div>

                                <div className="grid gap-2">
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Direktur Pemrakarsa</Label>
                                    <Select isMulti options={dirOptions} styles={selectStyles} value={selectedDir} onChange={setSelectedDir} placeholder="Pilih Direktur..." />
                                </div>

                                <div className="grid gap-2">
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Pemrakarsa</Label>
                                    <Select isMulti options={pemOptions} styles={selectStyles} value={selectedPemrakarsa} onChange={setSelectedPemrakarsa} placeholder="Pilih Pemrakarsa..." />
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
                                            <Input name="contactPerson" defaultValue={data.contactPerson ?? ""} className="pl-10 h-11" required />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Jabatan</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input name="position" defaultValue={data.position ?? ""} className="pl-10 h-11" required />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">No HP/WhatsApp</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input name="phone" defaultValue={data.phone ?? ""} className="pl-10 h-11" required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: LAMPIRAN DOKUMEN */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Dokumen Lampiran (PDF)</h3>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-center">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                    <p className="text-[10px] text-amber-800 font-medium leading-relaxed uppercase">
                                        Teks Perhatian: Kosongkan input file jika tidak ingin mengubah dokumen lama.
                                        Gunakan tombol <span className="font-black underline">Tidak Diperlukan</span> untuk membatalkan lampiran.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* DOKUMEN UTAMA LOOP */}
                                    {[
                                        { id: "kepdirSirkulerDoc", label: "1. Dokumen Kepdir Sirkuler" },
                                        { id: "grcDoc", label: "2. Dokumen GRC" },
                                    ].map((doc) => (
                                        <div key={doc.id} className={`p-4 rounded-xl border-2 transition-all ${notRequiredFiles.includes(doc.id) ? 'bg-slate-50 border-slate-200 opacity-60' : 'border-dashed border-[#14a2ba] bg-[#e7f6f9]/20'}`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <Label className="text-[10px] font-black text-[#125d72] uppercase">{doc.label}</Label>
                                                <Button type="button" variant="outline" size="sm" onClick={() => toggleNotRequired(doc.id)} className={`h-7 text-[9px] px-2 ${notRequiredFiles.includes(doc.id) ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500'}`}>
                                                    {notRequiredFiles.includes(doc.id) ? <><Eye className="h-3 w-3 mr-1" /> Diperlukan</> : <><EyeOff className="h-3 w-3 mr-1" /> Tidak Diperlukan</>}
                                                </Button>
                                            </div>

                                            {!notRequiredFiles.includes(doc.id) && (
                                                existingFiles[doc.id] ? (
                                                    <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white border-[#14a2ba]/30 shadow-sm">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <FileText className="w-4 h-4 text-[#14a2ba]" />
                                                            <span className="text-[10px] font-bold text-[#125d72] truncate">{existingFiles[doc.id]?.split('/').pop()}</span>
                                                        </div>
                                                        <button type="button" onClick={() => setConfirmDeleteField(doc.id)} className="p-1 hover:bg-red-50 rounded-full text-red-500 transition-colors">
                                                            <X className="w-4 h-4 " />
                                                        </button>

                                                        <AlertDialog open={confirmDeleteField === doc.id} onOpenChange={(o) => !o && setConfirmDeleteField(null)}>
                                                            <AlertDialogContent className="border-none shadow-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-[#125d72] font-black uppercase text-sm flex items-center gap-2">
                                                                        <AlertCircle className="h-5 w-5 text-red-500" /> Konfirmasi Penghapusan
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-xs italic">
                                                                        Apakah Anda yakin ingin menghapus berkas ini? File akan dihapus secara permanen dari penyimpanan saat Anda menyimpan perubahan modal ini.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="text-[10px] font-bold uppercase">Batal</AlertDialogCancel>
                                                                    <AlertDialogAction className="bg-red-500 text-white text-[10px] font-bold uppercase" onClick={() => { setExistingFiles(prev => ({ ...prev, [doc.id]: null })); setConfirmDeleteField(null); }}>
                                                                        Ya, Hapus Berkas
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                ) : (
                                                    <Input name={doc.id} type="file" accept=".pdf" className="h-10 text-[10px] cursor-pointer" />
                                                )
                                            )}
                                        </div>
                                    ))}

                                    {/* DOKUMEN PENDUKUNG LAINNYA */}
                                    <div className={`p-4 rounded-xl border-2 transition-all col-span-1 md:col-span-2 ${notRequiredFiles.includes('supportingDocuments') ? 'bg-slate-50 border-slate-200 opacity-60' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <Label className="text-[10px] font-black text-[#125d72] uppercase tracking-tighter">
                                                <Building2 className="h-3 w-3 inline mr-1 text-[#14a2ba]" /> 3. Tambahkan Dokumen Pendukung Lainnya (Multi-File)
                                            </Label>
                                            <Button type="button" variant="outline" size="sm" onClick={() => toggleNotRequired('supportingDocuments')} className={`h-7 text-[9px] px-2 ${notRequiredFiles.includes('supportingDocuments') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500'}`}>
                                                {notRequiredFiles.includes('supportingDocuments') ? <><Eye className="h-3 w-3 mr-1" /> Diperlukan</> : <><EyeOff className="h-3 w-3 mr-1" /> Tidak Diperlukan</>}
                                            </Button>
                                        </div>
                                        {!notRequiredFiles.includes('supportingDocuments') && (
                                            <Input name="supportingDocuments" type="file" multiple accept=".pdf" className="h-10 text-[10px] file:bg-[#125d72] file:text-white file:border-none file:rounded cursor-pointer" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending} className="font-bold text-slate-400 uppercase text-xs">Batal</Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-[#125d72] hover:bg-[#14a2ba] text-white rounded-xl h-12 px-10 font-black uppercase tracking-widest shadow-xl transition-all"
                        >
                            {isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memperbarui...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Simpan Perubahan</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}