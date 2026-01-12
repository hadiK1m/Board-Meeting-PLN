"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
    FileEdit,
    FileText,
    Loader2,
    X,
    Paperclip,
    EyeOff,
    Eye,
    AlertCircle,
    Save,
    User,
    Phone,
    Briefcase,
    Building2,
    Send,
    Trash2
} from "lucide-react"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
import Image from "next/image"
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

import { updateRakordirAction } from "@/server/actions/rakordir-actions"
import { Agenda } from "@/db/schema/agendas"
import {
    DIREKTURE_PEMRAKARSA,
    PEMRAKARSA,
    SUPPORT,
    extractCode
} from "@/lib/MasterData"

// --- KONFIGURASI STATIS ---

interface Option {
    label: string;
    value: string;
}

const RAKORDIR_FILE_FIELDS = [
    { id: "proposalNote", label: "ND Usulan Agenda" },
    { id: "presentationMaterial", label: "Materi Presentasi" }
] as const;

type RakordirFileFieldId = typeof RAKORDIR_FILE_FIELDS[number]["id"];

const dirOptions: Option[] = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));
const pemOptions: Option[] = PEMRAKARSA.map(p => ({ label: p, value: p }));
const supOptions: Option[] = SUPPORT.map(s => ({ label: s, value: s }));

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

interface EditRakordirModalProps {
    agenda: Agenda
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditRakordirModal({ agenda, open, onOpenChange }: EditRakordirModalProps) {
    const [isPending, setIsPending] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Form States
    const [judul, setJudul] = useState("")
    const [deadline, setDeadline] = useState("")
    const [prioritas, setPrioritas] = useState<string>("Low")
    const [contactPerson, setContactPerson] = useState("")
    const [position, setPosition] = useState("")
    const [phone, setPhone] = useState("")

    // Select States
    const [selectedDir, setSelectedDir] = useState<MultiValue<Option>>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<MultiValue<Option>>([])
    const [selectedSupport, setSelectedSupport] = useState<MultiValue<Option>>([])

    // File Logic States
    const [notRequired, setNotRequired] = useState<string[]>([]) // ID file yang ditandai "Tidak Perlu"
    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({}) // File path dari DB
    const [fileStatus, setFileStatus] = useState<Record<string, boolean>>({}) // Apakah user upload file baru?
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null) // Dialog hapus

    useEffect(() => {
        setMounted(true)
    }, [])

    // ✅ Sync Data Awal (Hanya saat modal dibuka)
    useEffect(() => {
        if (open && agenda) {
            setJudul(agenda.title || "")
            setDeadline(agenda.deadline ? format(new Date(agenda.deadline), "yyyy-MM-dd") : "")
            setPrioritas(agenda.priority || "Low")
            setContactPerson(agenda.contactPerson || "")
            setPosition(agenda.position || "")
            setPhone(agenda.phone || "")

            // Helper Sync Select
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

            // Sync File Eksisting
            const filesObj: Record<string, string | null> = {};
            RAKORDIR_FILE_FIELDS.forEach((f) => {
                const fieldId = f.id as RakordirFileFieldId;
                const agendaKey = fieldId as keyof typeof agenda;
                filesObj[fieldId] = (agenda[agendaKey] as string) ?? null;
            });
            setExistingFiles(filesObj);

            // Sync Not Required Files
            if (agenda.notRequiredFiles) {
                try {
                    const parsed = typeof agenda.notRequiredFiles === 'string'
                        ? JSON.parse(agenda.notRequiredFiles)
                        : agenda.notRequiredFiles;
                    setNotRequired(Array.isArray(parsed) ? parsed : []);
                } catch {
                    setNotRequired([]);
                }
            } else {
                setNotRequired([]);
            }

            // Reset status upload baru
            setFileStatus({});
        }
    }, [agenda, open]);

    // ✅ Logika Validasi (Real-time)
    const isComplete = useMemo(() => {
        const requiredFieldsOk =
            judul.trim() !== "" &&
            deadline !== "" &&
            selectedDir.length > 0 &&
            selectedPemrakarsa.length > 0 &&
            contactPerson.trim() !== "" &&
            position.trim() !== "" &&
            phone.trim() !== "";

        const filesOk = RAKORDIR_FILE_FIELDS.every(doc => {
            const isNotReq = notRequired.includes(doc.id);
            const hasExisting = existingFiles[doc.id] !== null;
            const hasNewUpload = fileStatus[doc.id];

            // File dianggap OK jika: Ditandai "Tidak Perlu" ATAU (Punya File Lama ATAU Upload Baru)
            return isNotReq || hasExisting || hasNewUpload;
        });

        return requiredFieldsOk && filesOk;
    }, [
        judul, deadline, selectedDir, selectedPemrakarsa,
        contactPerson, position, phone,
        existingFiles, fileStatus, notRequired
    ]);

    const handleDeadlineChange = (val: string) => {
        setDeadline(val)
        if (!val) return
        const days = differenceInDays(new Date(val), new Date())
        if (days <= 7) setPrioritas("High")
        else if (days <= 14) setPrioritas("Medium")
        else setPrioritas("Low")
    }

    const toggleNotRequired = (fieldId: string) => {
        setNotRequired(prev => {
            if (prev.includes(fieldId)) {
                // Jika sudah ada (Not Required), hapus (Jadi Required)
                return prev.filter(f => f !== fieldId);
            } else {
                // Jika belum ada (Required), tambah (Jadi Not Required)
                return [...prev, fieldId];
            }
        })
    }

    const handleFileChange = (fieldId: string, hasFile: boolean) => {
        setFileStatus(prev => ({ ...prev, [fieldId]: hasFile }));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        // ✅ FIX: Tangkap tombol mana yang diklik (Draft vs Submit)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submitter = (event.nativeEvent as any).submitter as HTMLButtonElement;
        if (submitter && submitter.name === "actionType") {
            formData.append("actionType", submitter.value);
        }

        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("support", selectedSupport.map(item => extractCode(item.value)).join(", "))
        formData.set("priority", prioritas)
        formData.set("notRequiredFiles", JSON.stringify(notRequired))

        // Tandai file lama yang dihapus user agar Server Action menghapusnya dari storage
        RAKORDIR_FILE_FIELDS.forEach(f => {
            if (existingFiles[f.id] === null) {
                formData.append(`delete_${f.id}`, 'true')
            }
        })

        try {
            const result = await updateRakordirAction(agenda.id, formData)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg animate-in slide-in-from-bottom-5">
                        <Image src="/logo-pln.png" alt="PLN" width={35} height={35} />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Perubahan Berhasil</h4>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                                Status: {submitter.value === "submit" ? "Siap Dilanjutkan" : "Draft"}
                            </p>
                        </div>
                        <button onClick={() => toast.dismiss(t)}><X className="h-4 w-4 text-slate-300" /></button>
                    </div>
                ))
                onOpenChange(false)
            } else {
                toast.error(result.error || "Gagal memperbarui data")
            }
        } catch {
            toast.error("Gagal terhubung ke server")
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
                                <FileEdit className="h-5 w-5 text-[#efe62f]" /> Edit Usulan Rakordir
                            </DialogTitle>
                            <DialogDescription className="text-[#e7f6f9]/90 italic font-medium">
                                Memperbarui usulan: <span className="text-white font-bold not-italic">{agenda.title}</span>
                            </DialogDescription>
                        </div>
                        <Badge className={`border-none uppercase text-[10px] px-3 ${isComplete ? "bg-emerald-500 text-white" : "bg-amber-400 text-[#125d72]"}`}>
                            {isComplete ? "Siap Lanjut" : "Draft Mode"}
                        </Badge>
                    </div>
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
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Judul Agenda</Label>
                                    <Input value={judul} onChange={(e) => setJudul(e.target.value)} name="title" required className="h-11 border-slate-200 focus:border-[#14a2ba]" />
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
                                    <Textarea name="urgency" defaultValue={agenda.urgency || ""} required className="min-h-24 bg-slate-50 border-slate-200 focus:border-[#14a2ba]" />
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

                            {/* SECTION 2: PEMRAKARSA & NARAHUBUNG */}
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
                                            <Label className="font-bold text-[#125d72] uppercase text-[11px]">Nama PIC</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input name="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="pl-10 h-11" required />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72] uppercase text-[11px]">Jabatan</Label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input name="position" value={position} onChange={(e) => setPosition(e.target.value)} className="pl-10 h-11" required />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72] uppercase text-[11px]">No WhatsApp</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input name="phone" type="number" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-11" required />
                                            </div>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {RAKORDIR_FILE_FIELDS.map((doc) => {
                                        // Cek apakah kolom ini ditandai sebagai "Tidak Perlu"
                                        const isNotRequired = notRequired.includes(doc.id);
                                        // Cek apakah ada file eksisting
                                        const hasExistingFile = existingFiles[doc.id];

                                        return (
                                            <div key={doc.id} className={`p-4 rounded-xl border-2 transition-all ${isNotRequired ? 'bg-slate-50 border-slate-200 opacity-60' : 'border-dashed border-[#14a2ba] bg-[#e7f6f9]/20'}`}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <Label className="text-[10px] font-black text-[#125d72] uppercase">{doc.label}</Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleNotRequired(doc.id)}
                                                        className={`h-7 text-[9px] px-2 font-bold ${isNotRequired ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500'}`}
                                                    >
                                                        {isNotRequired ? (
                                                            <><Eye className="h-3 w-3 mr-1" /> Kembalikan (Wajib)</>
                                                        ) : (
                                                            <><EyeOff className="h-3 w-3 mr-1" /> Tandai Tidak Perlu</>
                                                        )}
                                                    </Button>
                                                </div>

                                                {/* Tampilkan Input File JIKA field ini Required (tidak ada di notRequired) */}
                                                {!isNotRequired && (
                                                    hasExistingFile ? (
                                                        // Jika ada file lama, tampilkan Card File
                                                        <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white border-[#14a2ba]/30 shadow-sm">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <FileText className="w-4 h-4 text-[#14a2ba]" />
                                                                <span className="text-[10px] font-bold text-[#125d72] truncate max-w-37.5">
                                                                    {hasExistingFile.split('/').pop()}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmDeleteField(doc.id)}
                                                                className="p-1 hover:bg-red-50 rounded-full text-red-500 transition-colors"
                                                                title="Hapus file"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>

                                                            {/* Dialog Konfirmasi Hapus per File */}
                                                            <AlertDialog open={confirmDeleteField === doc.id} onOpenChange={(o) => !o && setConfirmDeleteField(null)}>
                                                                <AlertDialogContent className="border-none shadow-2xl">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-[#125d72] font-black uppercase text-sm flex items-center gap-2">
                                                                            <AlertCircle className="h-5 w-5 text-red-500" /> Hapus File?
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription className="text-xs italic">
                                                                            File akan dihapus permanen saat Anda menyimpan perubahan.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel className="text-[10px] font-bold uppercase">Batal</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            className="bg-red-500 text-white text-[10px] font-bold uppercase hover:bg-red-600"
                                                                            onClick={() => {
                                                                                setExistingFiles(prev => ({ ...prev, [doc.id]: null }));
                                                                                setConfirmDeleteField(null);
                                                                            }}
                                                                        >
                                                                            Ya, Hapus
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    ) : (
                                                        // Jika tidak ada file lama, tampilkan Input Upload
                                                        <Input
                                                            name={doc.id}
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={(e) => handleFileChange(doc.id, !!e.target.files?.[0])}
                                                            className="h-10 text-[10px] cursor-pointer"
                                                        />
                                                    )
                                                )}
                                            </div>
                                        )
                                    })}

                                    {/* DOKUMEN PENDUKUNG (OPSIONAL) */}
                                    <div className={`p-4 rounded-xl border-2 transition-all col-span-1 md:col-span-2 ${notRequired.includes('supportingDocuments') ? 'bg-slate-50 border-slate-200 opacity-60' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <Label className="text-[10px] font-black text-[#125d72] uppercase">Dokumen Pendukung Lainnya</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleNotRequired('supportingDocuments')}
                                                className={`h-7 text-[9px] px-2 font-bold ${notRequired.includes('supportingDocuments') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500'}`}
                                            >
                                                {notRequired.includes('supportingDocuments') ? (
                                                    <><Eye className="h-3 w-3 mr-1" /> Tampilkan Upload</>
                                                ) : (
                                                    <><EyeOff className="h-3 w-3 mr-1" /> Sembunyikan Upload</>
                                                )}
                                            </Button>
                                        </div>
                                        {!notRequired.includes('supportingDocuments') && (
                                            <Input
                                                name="supportingDocuments"
                                                type="file"
                                                multiple
                                                accept=".pdf"
                                                onChange={(e) => handleFileChange('supportingDocuments', !!e.target.files?.length)}
                                                className="h-10 text-[10px] file:bg-[#125d72] file:text-white file:border-none file:rounded cursor-pointer"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* ✅ FOOTER DENGAN LOGIKA TOMBOL PISAH */}
                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                            className="font-bold text-slate-400 uppercase text-xs hover:bg-slate-100 h-12 px-6 rounded-xl"
                        >
                            Batal
                        </Button>

                        {!isComplete ? (
                            <Button
                                type="submit"
                                name="actionType"
                                value="draft"
                                disabled={isPending}
                                className="h-12 px-8 font-bold uppercase tracking-widest shadow-lg transition-all min-w-56 rounded-xl bg-[#14a2ba] hover:bg-[#118a9e] text-white"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        <span>Simpan Draft</span>
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                name="actionType"
                                value="submit"
                                disabled={isPending}
                                className="h-12 px-10 font-black uppercase tracking-widest shadow-xl transition-all min-w-64 rounded-xl bg-[#125d72] hover:bg-[#0e4b5d] text-white"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        <span>Perbarui & Lanjutkan</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}