"use client"

import { useState, useEffect } from "react"
import {
    FileEdit,
    FileText,
    Loader2,
    X,
    Paperclip,
    EyeOff,
    PlusCircle // Pastikan icon ini ada atau gunakan icon lain jika PlusCircle custom component di bawah
} from "lucide-react"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
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
// ✅ Import Textarea
import { Textarea } from "@/components/ui/textarea"

import { updateRakordirAction } from "@/server/actions/rakordir-actions"
import { RakordirAgenda } from "./rakordir-client"
import {
    DIREKTURE_PEMRAKARSA,
    PEMRAKARSA,
    SUPPORT,
    extractCode
} from "@/lib/MasterData"

// --- TYPES & HELPER ---

interface ExtendedRakordirAgenda extends RakordirAgenda {
    position?: string | null;
    phone?: string | null;
    director?: string | null;
    initiator: string | null;
    support?: string | null;
    priority?: string | null;
    notRequiredFiles?: string | string[] | null;
    proposalNote?: string | null;
    presentationMaterial?: string | null;
}

interface EditRakordirModalProps {
    agenda: ExtendedRakordirAgenda
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Option = { label: string; value: string }

// Helper: Mapping MasterData string ke Option Object
const mapToOptions = (data: string[]) => data.map(item => ({
    value: extractCode(item),
    label: item
}));

const directorOptions = mapToOptions(DIREKTURE_PEMRAKARSA);
const initiatorOptions = mapToOptions(PEMRAKARSA);
const supportOptions = mapToOptions(SUPPORT);

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
        fontSize: "0.75rem",
        padding: "2px 6px",
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: "#125d72",
        "&:hover": { backgroundColor: "#14a2ba", color: "white" },
    }),
    menu: (base) => ({
        ...base,
        zIndex: 9999,
        fontSize: "0.875rem",
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? "#14a2ba" : state.isFocused ? "#e7f6f9" : "white",
        color: state.isSelected ? "white" : "#1e293b",
        cursor: "pointer",
    })
};

export function EditRakordirModal({ agenda, open, onOpenChange }: EditRakordirModalProps) {
    const [isPending, setIsPending] = useState(false)
    const [judul, setJudul] = useState(agenda.title || "")

    // ✅ State Prioritas
    const [prioritas, setPrioritas] = useState<string>("Low")

    // State untuk Select Options
    const [selectedDirectors, setSelectedDirectors] = useState<Option[]>([])
    const [selectedInitiators, setSelectedInitiators] = useState<Option[]>([])
    const [selectedSupports, setSelectedSupports] = useState<Option[]>([])

    const [notRequired, setNotRequired] = useState<string[]>([])
    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({})
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setJudul(agenda.title || "")
            // ✅ Set Initial Priority
            setPrioritas(agenda.priority ?? "Low")

            const findOptions = (dbValue: string | null | undefined, options: Option[]) => {
                if (!dbValue) return [];
                const values = dbValue.split(/,\s*/).filter(Boolean);
                return options.filter(opt => values.includes(opt.value));
            };

            setSelectedDirectors(findOptions(agenda.director, directorOptions));
            setSelectedInitiators(findOptions(agenda.initiator, initiatorOptions));
            setSelectedSupports(findOptions(agenda.support, supportOptions));

            if (agenda.notRequiredFiles) {
                try {
                    const parsed = typeof agenda.notRequiredFiles === "string"
                        ? JSON.parse(agenda.notRequiredFiles)
                        : agenda.notRequiredFiles
                    setNotRequired(Array.isArray(parsed) ? parsed : [])
                } catch {
                    setNotRequired([])
                }
            } else {
                setNotRequired([])
            }

            setExistingFiles({
                proposalNote: agenda.proposalNote ?? null,
                presentationMaterial: agenda.presentationMaterial ?? null,
            })
        }
    }, [agenda, open])

    // ✅ LOGIKA PERHITUNGAN PRIORITAS OTOMATIS
    const handleDeadlineChange = (val: string) => {
        if (!val) return
        const days = differenceInDays(new Date(val), new Date())
        if (days <= 7) setPrioritas("High")
        else if (days <= 14) setPrioritas("Medium")
        else setPrioritas("Low")
    }

    const toggleNotRequired = (field: string) => {
        setNotRequired(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)

        const formData = new FormData(event.currentTarget)

        try {
            // ✅ Masukkan nilai Priority dari State (bukan dari input karena inputnya visual div)
            formData.set("priority", prioritas)

            formData.set("director", selectedDirectors.map(d => d.value).join(", "))
            formData.set("initiator", selectedInitiators.map(i => i.value).join(", "))
            formData.set("support", selectedSupports.map(s => s.value).join(", "))
            formData.append("notRequiredFiles", JSON.stringify(notRequired))

            const fileFields = ['proposalNote', 'presentationMaterial'] as const;

            for (const f of fileFields) {
                const originalPath = agenda[f];
                const current = existingFiles[f]

                if (originalPath && current === null) {
                    formData.append(`delete_${f}`, 'true')
                }
            }

            const result = await updateRakordirAction(formData, agenda.id)

            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg">
                        <Image src="/logo-pln.png" alt="PLN" width={40} height={40} />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Berhasil Diperbarui</h4>
                            <p className="text-xs text-slate-500 italic">Data agenda Rakordir telah diperbarui.</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)}><X className="h-4 w-4 text-slate-300 hover:text-red-500" /></button>
                    </div>
                ))
                onOpenChange(false)
            } else {
                toast.error(result.error || "Gagal memperbarui data")
            }
        } catch {
            toast.error("Terjadi kesalahan koneksi")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase">
                        <FileEdit className="h-5 w-5 text-[#efe62f]" /> Edit Usulan Rakordir
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
                                    <Label className="font-bold text-[#125d72]">Judul Agenda</Label>
                                    <Input
                                        name="title"
                                        value={judul}
                                        onChange={(e) => setJudul(e.target.value)}
                                        required
                                        placeholder="Masukkan judul agenda rakordir..."
                                    />
                                </div>

                                {/* ✅ UPDATE: Urgensi Full Width dengan Textarea */}
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72]">Urgensi</Label>
                                    <Textarea
                                        name="urgency"
                                        defaultValue={agenda.urgency || ""}
                                        placeholder="Jelaskan urgensi..."
                                        required
                                        className="min-h-25 bg-[#f8fafc] border-[#e2e8f0] focus:border-[#14a2ba] focus:ring-[#14a2ba]"
                                    />
                                </div>

                                {/* ✅ UPDATE: Grid 2 Kolom untuk Deadline & Prioritas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Deadline Rapat</Label>
                                        <Input
                                            name="deadline"
                                            type="date"
                                            defaultValue={agenda.deadline ? format(new Date(agenda.deadline), "yyyy-MM-dd") : ""}
                                            onChange={(e) => handleDeadlineChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Prioritas</Label>
                                        {/* Tampilan Visual Prioritas (Bukan Input Edit) */}
                                        <div className="h-10 flex items-center px-4 border-2 rounded-md bg-[#f8fafc] font-black italic text-xs">
                                            <span className={prioritas === 'High' ? 'text-red-600' : prioritas === 'Medium' ? 'text-orange-500' : 'text-green-600'}>
                                                {prioritas}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: PEMRAKARSA & NARAHUBUNG (DIGABUNG) */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    {/* Gunakan icon PlusCircle atau icon lain yang sesuai */}
                                    <FileEdit className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">PEMRAKARSA & NARAHUBUNG</h3>
                                </div>
                                <div className="grid gap-6">
                                    {/* 1. Direktur Pemrakarsa (Full Width) */}
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Direktur Pemrakarsa</Label>
                                        <Select
                                            isMulti
                                            styles={selectStyles}
                                            options={directorOptions}
                                            value={selectedDirectors}
                                            onChange={(v) => setSelectedDirectors(v as Option[])}
                                        />
                                    </div>
                                    {/* 2. Divisi Pemrakarsa (Full Width) */}
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Divisi Pemrakarsa</Label>
                                        <Select
                                            isMulti
                                            styles={selectStyles}
                                            options={initiatorOptions}
                                            value={selectedInitiators}
                                            onChange={(v) => setSelectedInitiators(v as Option[])}
                                        />
                                    </div>
                                    {/* 3. Support (Full Width) */}
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Support</Label>
                                        <Select
                                            isMulti
                                            styles={selectStyles}
                                            options={supportOptions}
                                            value={selectedSupports}
                                            onChange={(v) => setSelectedSupports(v as Option[])}
                                        />
                                    </div>
                                    {/* 4. Narahubung (3 Columns) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72]">Narahubung</Label>
                                            <Input name="contactPerson" defaultValue={agenda.contactPerson || ""} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72]">Jabatan</Label>
                                            <Input name="position" defaultValue={agenda.position || ""} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="font-bold text-[#125d72]">No HP/WA</Label>
                                            {/* ✅ UPDATE: Tipe input menjadi number */}
                                            <Input name="phone" type="number" defaultValue={agenda.phone || ""} required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: LAMPIRAN */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Lampiran Dokumen (PDF)</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: "proposalNote", label: "ND Usulan Agenda" },
                                        { id: "presentationMaterial", label: "Materi Presentasi" }
                                    ].map((doc) => (
                                        <div key={doc.id} className={`p-4 rounded-lg border transition-all group shadow-sm ${notRequired.includes(doc.id) ? 'bg-slate-100 opacity-60' : 'bg-[#fcfcfc] hover:bg-[#e7f6f9]/30'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="text-[10px] font-black text-[#125d72] uppercase opacity-70 group-hover:opacity-100">{doc.label}</Label>

                                                {!existingFiles[doc.id] && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className={`h-6 text-[9px] px-2 ${notRequired.includes(doc.id) ? 'bg-red-50 text-red-600 border-red-200' : 'text-slate-500'}`}
                                                        onClick={() => toggleNotRequired(doc.id)}
                                                    >
                                                        <EyeOff className="h-3 w-3 mr-1" />
                                                        {notRequired.includes(doc.id) ? "Dibutuhkan" : "Tidak Diperlukan"}
                                                    </Button>
                                                )}
                                            </div>

                                            {existingFiles[doc.id] ? (
                                                <div className="flex items-center justify-between p-2 border rounded bg-slate-50 mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm truncate max-w-50">{existingFiles[doc.id]!.split('/').pop()}</span>
                                                    </div>
                                                    <>
                                                        <button type="button" onClick={() => setConfirmDeleteField(doc.id)} className="p-1 hover:bg-red-100 rounded text-red-500">
                                                            <X className="w-4 h-4" />
                                                        </button>

                                                        <AlertDialog open={confirmDeleteField === doc.id} onOpenChange={(open) => { if (!open) setConfirmDeleteField(null) }}>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Hapus lampiran?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        File akan dihapus dari bucket dan database. Tindakan ini tidak dapat dibatalkan setelah disimpan.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => setConfirmDeleteField(null)}>Batal</AlertDialogCancel>
                                                                    <AlertDialogAction className="bg-red-500 text-white hover:bg-red-600" onClick={() => { setExistingFiles(prev => ({ ...prev, [doc.id]: null })); setConfirmDeleteField(null); }}>
                                                                        Ya, hapus
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </>
                                                </div>
                                            ) : (
                                                <>
                                                    {!notRequired.includes(doc.id) ? (
                                                        <Input name={doc.id} type="file" accept=".pdf" className="h-9 text-[10px] mt-2 file:mr-2.5 file:pr-1.5 file:pl-1.5 file:bg-[#14a2ba] file:text-white file:border-none file:rounded-md cursor-pointer" />
                                                    ) : (
                                                        <div className="h-9 flex items-center text-[10px] italic text-slate-400">Dokumen ditandai tidak diperlukan</div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    <div className={`p-4 rounded-lg border-2 border-dashed col-span-1 md:col-span-2 transition-all shadow-inner ${notRequired.includes('supportingDocuments') ? 'bg-slate-100 opacity-60 border-slate-300' : 'border-[#14a2ba] bg-white'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <Label className={`text-[10px] font-black uppercase ${notRequired.includes('supportingDocuments') ? 'text-slate-400' : 'text-[#14a2ba]'}`}>
                                                Dokumen Pendukung (Multi-File)
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={`h-6 text-[9px] px-2 ${notRequired.includes('supportingDocuments') ? 'bg-red-50 text-red-600 border-red-200' : 'text-[#14a2ba] border-[#14a2ba]/30 hover:bg-[#14a2ba] hover:text-white'}`}
                                                onClick={() => toggleNotRequired('supportingDocuments')}
                                            >
                                                <EyeOff className="h-3 w-3 mr-1" />
                                                {notRequired.includes('supportingDocuments') ? "Dibutuhkan" : "Tidak Diperlukan"}
                                            </Button>
                                        </div>
                                        {!notRequired.includes('supportingDocuments') ? (
                                            <Input name="supportingDocuments" type="file" multiple accept=".pdf" className="h-9 text-[10px] mt-2 file:rounded-md file:pr-1.5 file:pl-1.5 file:bg-[#125d72] file:text-white cursor-pointer" />
                                        ) : (
                                            <div className="py-2 text-[10px] italic text-slate-400 text-center">
                                                Dokumen pendukung tambahan ditandai tidak diperlukan.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-bold px-8 shadow-lg min-w-45"
                        >
                            {isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                            ) : (
                                "Simpan Perubahan"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}