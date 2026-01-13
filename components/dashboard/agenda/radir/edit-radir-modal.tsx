/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
    FileEdit,
    Loader2,
    X,
    FileText,
    Paperclip,
    EyeOff,
    Eye,
    AlertCircle,
    User,
    Phone,
    Briefcase,
    Building2,
    Save
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Select, { MultiValue, StylesConfig } from "react-select"
import { format, differenceInDays } from "date-fns"

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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { updateRadirAction } from "@/server/actions/radir-actions"
import { Agenda } from "@/db/schema/agendas"
import {
    DIREKTURE_PEMRAKARSA,
    PEMRAKARSA,
    SUPPORT,
    extractCode
} from "@/lib/MasterData"
import { createClient } from "@/lib/supabase/client" // Import supabase client

const supabase = createClient()

interface Option {
    label: string;
    value: string;
}

const dirOptions: Option[] = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));
const pemOptions: Option[] = PEMRAKARSA.map(p => ({ label: p, value: p }));
const supOptions: Option[] = SUPPORT.map(s => ({ label: s, value: s }));

const FILE_FIELDS = [
    { id: "legalReview", label: "Kajian Hukum" },
    { id: "riskReview", label: "Kajian Risiko" },
    { id: "complianceReview", label: "Kajian Kepatuhan" },
    { id: "regulationReview", label: "Kajian Regulasi" },
    { id: "recommendationNote", label: "Nota Analisa Rekomendasi" },
    { id: "proposalNote", label: "ND Usulan Agenda" },
    { id: "presentationMaterial", label: "Materi Presentasi" },
] as const;

// Tambahkan supportingDocuments ke dalam list file yang akan diupload
const ALL_FILE_FIELDS = [
    ...FILE_FIELDS,
    { id: "supportingDocuments", label: "Dokumen Pendukung" }
] as const;

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

interface EditRadirModalProps {
    agenda: Agenda;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditRadirModal({ agenda, open, onOpenChange }: EditRadirModalProps) {
    const [isPending, setIsPending] = useState(false)
    const [mounted, setMounted] = useState(false)

    const [judul, setJudul] = useState("")
    const [deadline, setDeadline] = useState("")
    const [prioritas, setPrioritas] = useState<string>("Low")

    const [selectedDir, setSelectedDir] = useState<MultiValue<Option>>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<MultiValue<Option>>([])
    const [selectedSupport, setSelectedSupport] = useState<MultiValue<Option>>([])

    const [notRequired, setNotRequired] = useState<string[]>([])
    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({})
    const [fileStatus, setFileStatus] = useState<Record<string, boolean>>({})
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)
    const [uploadedFilePaths, setUploadedFilePaths] = useState<Record<string, string[]>>({}) // Untuk supportingDocuments multiple files

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (open && agenda) {
            setJudul(agenda.title)
            setDeadline(agenda.deadline ? format(new Date(agenda.deadline), "yyyy-MM-dd") : "")
            setPrioritas(agenda.priority ?? "Normal")

            // ✅ PERBAIKAN LOGIKA SINKRONISASI DATA MULTI-SELECT
            const syncMultiSelect = (dbValue: string | null, masterOptions: Option[]) => {
                if (!dbValue) return [];
                const valuesFromDb = dbValue.split(',').map(v => v.trim());

                return masterOptions.filter(opt =>
                    valuesFromDb.includes(opt.value) ||
                    valuesFromDb.includes(extractCode(opt.value))
                );
            };

            setSelectedDir(syncMultiSelect(agenda.director, dirOptions));
            setSelectedPemrakarsa(syncMultiSelect(agenda.initiator, pemOptions));
            setSelectedSupport(syncMultiSelect(agenda.support, supOptions));

            const filesObj: Record<string, string | null> = {};
            FILE_FIELDS.forEach(f => {
                filesObj[f.id] = (agenda as unknown as Record<string, string | null>)[f.id] ?? null;
            });

            // Handle supportingDocuments (bisa array atau null)
            if (Array.isArray(agenda.supportingDocuments) && agenda.supportingDocuments.length > 0) {
                // Simpan sebagai string JSON untuk display
                filesObj["supportingDocuments"] = JSON.stringify(agenda.supportingDocuments);
            } else {
                filesObj["supportingDocuments"] = null;
            }

            setExistingFiles(filesObj);

            if (agenda.notRequiredFiles) {
                try {
                    const parsed = typeof agenda.notRequiredFiles === 'string'
                        ? JSON.parse(agenda.notRequiredFiles)
                        : agenda.notRequiredFiles;
                    setNotRequired(Array.isArray(parsed) ? parsed : []);
                } catch {
                    setNotRequired([]);
                }
            }

            // Reset uploaded file paths saat modal dibuka
            setUploadedFilePaths({});
        }
    }, [agenda, open]);

    const isComplete = useMemo(() => {
        const filesOk = FILE_FIELDS.every(doc =>
            existingFiles[doc.id] !== null || fileStatus[doc.id] || notRequired.includes(doc.id)
        );
        const supportingOk = fileStatus["supportingDocuments"] ||
            notRequired.includes("supportingDocuments") ||
            (Array.isArray(agenda.supportingDocuments) && agenda.supportingDocuments.length > 0) ||
            (uploadedFilePaths["supportingDocuments"] && uploadedFilePaths["supportingDocuments"].length > 0);

        return filesOk && supportingOk;
    }, [existingFiles, fileStatus, notRequired, agenda.supportingDocuments, uploadedFilePaths]);

    const handleDeadlineChange = (val: string) => {
        setDeadline(val)
        if (!val) return
        const days = differenceInDays(new Date(val), new Date())
        if (days <= 7) setPrioritas("High")
        else if (days <= 14) setPrioritas("Medium")
        else setPrioritas("Low")
    }

    const toggleNotRequired = (fieldId: string) => {
        setNotRequired(prev =>
            prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
        )
    }

    const handleFileChange = (fieldId: string, hasFile: boolean) => {
        setFileStatus(prev => ({ ...prev, [fieldId]: hasFile }));
    }

    const handleRemoveSupportingDoc = (index: number) => {
        setExistingFiles(prev => {
            try {
                // Mengambil data dokumen pendukung lama dari state
                const currentDocs = JSON.parse(prev["supportingDocuments"] || '[]');
                const updatedDocs = [...currentDocs];

                // Menghapus file berdasarkan index yang dipilih
                updatedDocs.splice(index, 1);

                return {
                    ...prev,
                    "supportingDocuments": updatedDocs.length > 0 ? JSON.stringify(updatedDocs) : null
                };
            } catch {
                return prev;
            }
        });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        try {
            // Ambil User ID untuk path folder
            const { data: { user } } = await supabase.auth.getUser()
            const userId = user?.id || "anonymous"

            // Proses upload untuk semua file fields
            // Di dalam handleSubmit...
            for (const field of ALL_FILE_FIELDS) {
                const fileInput = document.querySelector(`input[name="${field.id}"]`) as HTMLInputElement
                formData.delete(field.id) // Tetap hapus biner

                if (field.id === "supportingDocuments" && fileInput?.files) {
                    const files = Array.from(fileInput.files)
                    if (files.length > 0) {
                        const uploadedPaths: string[] = []
                        for (const file of files) {
                            try {
                                const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf"
                                const uniqueId = crypto.randomUUID()
                                const path = `radir/${userId}/${uniqueId}-${field.id}.${fileExt}`

                                // Hapus 'uploadData' karena tidak digunakan
                                const { error: uploadError } = await supabase.storage
                                    .from("agenda-attachments")
                                    .upload(path, file)

                                if (uploadError) throw uploadError
                                uploadedPaths.push(path)
                            } catch { // Gunakan '_err' untuk menandakan variabel sengaja tidak dipakai
                                toast.error(`Gagal unggah salah satu file ${field.label}`)
                                setIsPending(false)
                                return
                            }
                        }
                        formData.set(`${field.id}Paths`, JSON.stringify(uploadedPaths))
                        setUploadedFilePaths(prev => ({ ...prev, [field.id]: uploadedPaths }))
                    }
                } else if (fileInput?.files?.[0]) {
                    const file = fileInput.files[0]
                    try {
                        const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf"
                        const uniqueId = crypto.randomUUID()
                        const path = `radir/${userId}/${uniqueId}-${field.id}.${fileExt}`

                        const { error: uploadError } = await supabase.storage
                            .from("agenda-attachments")
                            .upload(path, file)

                        if (uploadError) throw uploadError
                        formData.set(`${field.id}Path`, path)
                    } catch {
                        toast.error(`Gagal unggah ${field.label}`)
                        setIsPending(false)
                        return
                    }
                }
            }

            // Set data lainnya
            formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
            formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
            formData.set("support", selectedSupport.map(item => extractCode(item.value)).join(", "))
            formData.set("priority", prioritas)
            formData.set("notRequiredFiles", JSON.stringify(notRequired))
            formData.set("status", isComplete ? "DAPAT_DILANJUTKAN" : "DRAFT")

            // Handle penghapusan file yang ada
            FILE_FIELDS.forEach(f => {
                const originalPath = (agenda as unknown as Record<string, string | null>)[f.id];
                if (originalPath && existingFiles[f.id] === null) {
                    formData.append(`delete_${f.id}`, 'true')
                }
            })

            // Handle penghapusan supportingDocuments
            if (existingFiles["supportingDocuments"] !== null && !fileStatus["supportingDocuments"]) {
                formData.append("delete_supportingDocuments", 'true')
            }

            // Kirim ke Server Action (hanya metadata, tanpa file biner)
            const result = await updateRadirAction(agenda.id, formData)

            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg">
                        <Image src="/logo-pln.png" alt="PLN" width={35} height={35} />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Perubahan Berhasil</h4>
                            <p className="text-[10px] text-slate-500 uppercase">Data usulan radir telah diperbarui</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)}><X className="h-4 w-4 text-slate-300" /></button>
                    </div>
                ))
                onOpenChange(false)
            } else {
                toast.error(result.error || "Gagal memperbarui data")
            }
        } catch (error) {
            console.error("Submit error:", error)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsPending(false)
        }
    }

    if (!mounted) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                                <FileEdit className="h-5 w-5 text-[#efe62f]" /> Edit Usulan Radir
                            </DialogTitle>
                            <DialogDescription className="text-[#e7f6f9]/90 italic font-medium">
                                Memperbarui agenda: <span className="text-white font-bold not-italic">{agenda.title}</span>
                            </DialogDescription>
                        </div>
                        <Badge className="bg-[#14a2ba] text-white border-none uppercase text-[10px] px-3">Edit Mode</Badge>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6 bg-white">
                        <div className="grid gap-10 pb-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Informasi Utama</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Judul Agenda</Label>
                                    <Input value={judul} onChange={(e) => setJudul(e.target.value)} name="title" required className="h-11 border-slate-200" />
                                </div>
                                <div className="grid gap-3">
                                    {judul && (
                                        <div className="p-4 bg-[#e7f6f9] border-l-4 border-[#14a2ba] rounded-sm animate-in fade-in slide-in-from-top-1">
                                            <p className="text-[10px] font-bold text-[#125d72] uppercase opacity-60 tracking-wider">Preview Teks Surat:</p>
                                            <p className="text-sm font-semibold text-[#125d72] mt-1 italic leading-relaxed uppercase">
                                                &quot;Usulan Persetujuan Direksi tentang {judul}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Urgensi</Label>
                                    <Textarea name="urgency" defaultValue={agenda.urgency || ""} required className="min-h-24 border-slate-200" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Deadline Rapat</Label>
                                        <Input name="deadline" type="date" value={deadline} onChange={(e) => handleDeadlineChange(e.target.value)} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Prioritas (System)</Label>
                                        <div className="h-10 flex items-center px-4 border-2 rounded-md bg-[#f8fafc] font-black italic text-xs shadow-inner">
                                            <span className={prioritas === 'High' ? 'text-red-600' : prioritas === 'Medium' ? 'text-orange-500' : 'text-green-600'}>{prioritas}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Building2 className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Pemrakarsa & Narahubung</h3>
                                </div>
                                <div className="grid gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Direktur Pemrakarsa</Label>
                                        <Select isMulti options={dirOptions} styles={selectStyles} value={selectedDir} onChange={setSelectedDir} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Pemrakarsa</Label>
                                        <Select isMulti options={pemOptions} styles={selectStyles} value={selectedPemrakarsa} onChange={setSelectedPemrakarsa} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] uppercase text-[11px]">Support</Label>
                                        <Select isMulti options={supOptions} styles={selectStyles} value={selectedSupport} onChange={setSelectedSupport} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72] uppercase text-[11px]">Nama Narahubung</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input name="contactPerson" defaultValue={agenda.contactPerson ?? ""} className="pl-10 h-11" required />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72] uppercase text-[11px]">Jabatan</Label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input name="position" defaultValue={agenda.position ?? ""} className="pl-10 h-11" required />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72] uppercase text-[11px]">No WhatsApp</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input name="phone" type="number" defaultValue={agenda.phone ?? ""} className="pl-10 h-11" required />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Dokumen Lampiran (PDF)</h3>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-center">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                    <p className="text-[10px] text-amber-800 font-medium leading-relaxed uppercase tracking-tight">
                                        Perhatian: Kosongkan input file jika tidak ingin mengganti dokumen lama.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Hanya render field-file utama (kecuali supportingDocuments) */}
                                    {FILE_FIELDS.map((doc) => (
                                        <div key={doc.id} className={`p-4 rounded-xl border-2 transition-all ${notRequired.includes(doc.id) ? 'bg-slate-50 border-slate-200 opacity-60' : 'border-dashed border-[#14a2ba] bg-[#e7f6f9]/20'}`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <Label className="text-[10px] font-black text-[#125d72] uppercase">{doc.label}</Label>
                                                <Button type="button" variant="outline" size="sm" onClick={() => toggleNotRequired(doc.id)} className={`h-7 text-[9px] px-2 ${notRequired.includes(doc.id) ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500'}`}>
                                                    {notRequired.includes(doc.id) ? <><Eye className="h-3 w-3 mr-1" /> Diperlukan</> : <><EyeOff className="h-3 w-3 mr-1" /> Tidak Diperlukan</>}
                                                </Button>
                                            </div>

                                            {!notRequired.includes(doc.id) && (
                                                existingFiles[doc.id] ? (
                                                    <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <FileText className="w-4 h-4 text-[#14a2ba]" />
                                                            <span className="text-[10px] font-bold text-[#125d72] truncate">
                                                                {/* Hanya menampilkan nama file untuk field-file utama */}
                                                                {typeof existingFiles[doc.id] === 'string' && existingFiles[doc.id]?.split('/').pop()}
                                                            </span>
                                                        </div>
                                                        <button type="button" onClick={() => setConfirmDeleteField(doc.id)} className="p-1 text-red-500">
                                                            <X className="w-4 h-4" />
                                                        </button>

                                                        <AlertDialog open={confirmDeleteField === doc.id} onOpenChange={(o) => !o && setConfirmDeleteField(null)}>
                                                            <AlertDialogContent className="border-none shadow-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-[#125d72] font-black uppercase text-sm">Hapus Berkas?</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-xs italic">Penghapusan akan permanen setelah Anda menyimpan perubahan.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="text-[10px] font-bold uppercase">Batal</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-red-500 text-white text-[10px] font-bold uppercase"
                                                                        onClick={() => {
                                                                            setExistingFiles(prev => ({ ...prev, [doc.id]: null }));
                                                                            setConfirmDeleteField(null);
                                                                        }}
                                                                    >
                                                                        Hapus
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        name={doc.id}
                                                        type="file"
                                                        accept=".pdf"
                                                        onChange={(e) => handleFileChange(doc.id, !!e.target.files?.[0])}
                                                        className="h-10 text-[10px]"
                                                    />
                                                )
                                            )}
                                        </div>
                                    ))}

                                    {/* SEKSI KHUSUS DOKUMEN PENDUKUNG (Multiple) */}
                                    <div className="p-4 rounded-xl border-2 border-dashed border-[#14a2ba] bg-[#e7f6f9]/10 col-span-1 md:col-span-2">
                                        <Label className="text-[10px] font-black text-[#125d72] uppercase mb-3 block">
                                            Dokumen Pendukung Lainnya
                                            <span className="text-xs font-normal text-gray-500 ml-2">(Opsional, dapat upload multiple)</span>
                                        </Label>

                                        {/* Render file pendukung yang sudah ada */}
                                        {existingFiles["supportingDocuments"] && (
                                            <div className="space-y-2 mb-3">
                                                {(() => {
                                                    try {
                                                        const files = JSON.parse(existingFiles["supportingDocuments"] || '[]');
                                                        return files.map((path: string, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 border rounded bg-white">
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <FileText className="w-4 h-4 text-[#14a2ba]" />
                                                                    <span className="text-[10px] text-[#125d72] truncate">
                                                                        {path.split('/').pop()}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSupportingDoc(idx)}
                                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ));
                                                    } catch (error) {
                                                        return null;
                                                    }
                                                })()}
                                            </div>
                                        )}

                                        <Input
                                            name="supportingDocuments"
                                            type="file"
                                            multiple
                                            accept=".pdf"
                                            onChange={(e) => handleFileChange("supportingDocuments", !!e.target.files?.length)}
                                            className="h-10 text-[10px]"
                                        />

                                        <p className="text-[10px] text-gray-500 mt-2">
                                            * Anda dapat memilih lebih dari satu file dengan menekan Ctrl/Cmd + Klik
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                            className="font-bold text-slate-400 uppercase text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className={`h-12 px-10 font-black uppercase tracking-widest shadow-xl transition-all ${isComplete ? 'bg-[#125d72]' : 'bg-[#14a2ba]'} text-white rounded-xl`}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="h-4 w-4" />
                                    {isComplete ? "Perbarui & Lanjutkan" : "Simpan Draft"}
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}