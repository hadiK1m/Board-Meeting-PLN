"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, FileText, Paperclip, Loader2, X, EyeOff, Send } from "lucide-react"
import { toast } from "sonner"
import { differenceInDays } from "date-fns"
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

import { createRadirAction } from "@/server/actions/radir-actions"
import {
    DIREKTURE_PEMRAKARSA,
    PEMRAKARSA,
    SUPPORT,
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

export function AddRadirModal() {
    const [isClient, setIsClient] = useState(false)
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const [judul, setJudul] = useState("")
    const [deadline, setDeadline] = useState("")
    const [prioritas, setPrioritas] = useState("Low")

    const [notRequiredFiles, setNotRequiredFiles] = useState<string[]>([])
    const [fileStatus, setFileStatus] = useState<Record<string, boolean>>({})

    const [selectedDir, setSelectedDir] = useState<MultiValue<{ label: string, value: string }>>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<MultiValue<{ label: string, value: string }>>([])
    const [selectedSupport, setSelectedSupport] = useState<MultiValue<{ label: string, value: string }>>([])

    const dirOptions = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));
    const pemOptions = PEMRAKARSA.map(p => ({ label: p, value: p }));
    const supOptions = SUPPORT.map(s => ({ label: s, value: s }));

    const FILE_LIST = [
        { id: "legalReview", label: "Kajian Hukum" },
        { id: "riskReview", label: "Kajian Risiko" },
        { id: "complianceReview", label: "Kajian Kepatuhan" },
        { id: "regulationReview", label: "Kajian Regulasi" },
        { id: "recommendationNote", label: "Nota Analisa Rekomendasi" },
        { id: "proposalNote", label: "ND Usulan Agenda" },
        { id: "presentationMaterial", label: "Materi Presentasi" },
    ];

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (deadline) {
            const days = differenceInDays(new Date(deadline), new Date())
            if (days <= 7) setPrioritas("High")
            else if (days <= 14) setPrioritas("Medium")
            else setPrioritas("Low")
        }
    }, [deadline])

    const resetForm = () => {
        setJudul(""); setDeadline(""); setSelectedDir([]); setSelectedPemrakarsa([]); setSelectedSupport([]);
        setNotRequiredFiles([]); setFileStatus({});
    }

    const toggleNotRequired = (fieldId: string) => {
        setNotRequiredFiles(prev =>
            prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
        )
    }

    const handleFileChange = (fieldId: string, hasFile: boolean) => {
        setFileStatus(prev => ({ ...prev, [fieldId]: hasFile }));
    }

    // ✅ Perbaikan logika isComplete: Hanya dokumen utama (FILE_LIST) yang wajib
    // Dokumen pendukung bersifat opsional dan tidak mengunci status "Dapat Dilanjutkan"
    const isComplete = FILE_LIST.every(doc => fileStatus[doc.id] || notRequiredFiles.includes(doc.id));

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("support", selectedSupport.map(item => extractCode(item.value)).join(", "))
        formData.set("priority", prioritas)
        formData.set("notRequiredFiles", JSON.stringify(notRequiredFiles))
        formData.set("meetingType", "RADIR")

        try {
            const result = await createRadirAction(formData)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg min-w-87.5">
                        <div className="shrink-0">
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Data Berhasil Disimpan</h4>
                            <p className="text-xs text-slate-500 italic">Status Radir: {isComplete ? "Dapat Dilanjutkan" : "Draft"}</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))
                setOpen(false)
                resetForm()
                router.refresh()
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
                <Button className="bg-[#14a2ba] hover:bg-[#125d72] text-white shadow-lg font-semibold rounded-xl h-11 px-6 transition-all active:scale-95">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Usulan Radir
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                        <PlusCircle className="h-5 w-5 text-[#efe62f]" /> Form Usulan Agenda Radir
                    </DialogTitle>
                    <DialogDescription className="text-[#e7f6f9]/90 italic font-medium">
                        &quot;Sistem Board Meeting PLN - Lengkapi usulan rapat direksi&quot;
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6 bg-white">
                        <div className="grid gap-10 pb-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Informasi Utama Agenda</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Judul Agenda</Label>
                                    <Input
                                        value={judul}
                                        onChange={(e) => setJudul(e.target.value)}
                                        name="title"
                                        required
                                        className="h-11 border-slate-200 focus:border-[#14a2ba]"
                                    />

                                    {judul && (
                                        <div className="p-4 bg-[#e7f6f9] border-l-4 border-[#14a2ba] rounded-sm animate-in fade-in slide-in-from-top-1">
                                            <p className="text-[10px] font-bold text-[#125d72] uppercase opacity-60 tracking-wider">Preview Teks Surat:</p>
                                            <p className="text-sm font-semibold text-[#125d72] mt-1 italic leading-relaxed uppercase">
                                                &quot;Usulan Persetujuan Direksi tentang {judul}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72]">Urgensi</Label><Input name="urgency" placeholder="Sangat Segera / Normal" required /></div>
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72]">Deadline Rapat</Label><Input name="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /></div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Prioritas (System)</Label>
                                        <div className="h-10 flex items-center px-4 border-2 rounded-md bg-[#f8fafc] font-black italic text-xs shadow-inner">
                                            <span className={prioritas === 'High' ? 'text-red-600' : prioritas === 'Medium' ? 'text-orange-500' : 'text-green-600'}>{prioritas}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <PlusCircle className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">PEMRAKARSA & NARAHUBUNG</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Direktur Pemrakarsa </Label>
                                        <Select isMulti options={dirOptions} styles={selectStyles} value={selectedDir} onChange={setSelectedDir} placeholder="Pilih Direktur..." menuPlacement="auto" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Pemrakarsa</Label>
                                        <Select isMulti options={pemOptions} styles={selectStyles} value={selectedPemrakarsa} onChange={setSelectedPemrakarsa} placeholder="Pilih Pemrakarsa..." menuPlacement="auto" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Support</Label>
                                        <Select isMulti options={supOptions} styles={selectStyles} value={selectedSupport} onChange={setSelectedSupport} placeholder="Pilih Unit Support..." menuPlacement="auto" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72]">Narahubung</Label><Input name="contactPerson" placeholder="Nama Narahubung" required /></div>
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72]">Jabatan</Label><Input name="position" placeholder="Jabatan" required /></div>
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72]">No WhatsApp</Label><Input name="phone" type="number" placeholder="628123..." required /></div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Lampiran Dokumen (PDF)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {FILE_LIST.map((doc) => (
                                        <div key={doc.id} className={`p-4 rounded-lg border transition-all group shadow-sm ${notRequiredFiles.includes(doc.id) ? 'bg-slate-100 opacity-60' : 'bg-[#fcfcfc] hover:bg-[#e7f6f9]/30'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <Label htmlFor={doc.id} className="text-[10px] font-black text-[#125d72] uppercase">{doc.label}</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={`h-6 text-[9px] px-2 ${notRequiredFiles.includes(doc.id) ? 'bg-red-50 text-red-600 border-red-200' : 'text-slate-500'}`}
                                                    onClick={() => toggleNotRequired(doc.id)}
                                                >
                                                    <EyeOff className="h-3 w-3 mr-1" />
                                                    {notRequiredFiles.includes(doc.id) ? "Dibutuhkan" : "Tidak Diperlukan"}
                                                </Button>
                                            </div>
                                            {!notRequiredFiles.includes(doc.id) && (
                                                <Input
                                                    id={doc.id}
                                                    name={doc.id}
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => handleFileChange(doc.id, !!e.target.files?.[0])}
                                                    className="h-9 text-[10px] file:mr-2.5 file:bg-[#14a2ba] file:text-white file:border-none file:rounded-md cursor-pointer"
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <div className={`p-4 rounded-lg border-2 border-dashed col-span-1 md:col-span-2 transition-all shadow-inner ${notRequiredFiles.includes('supportingDocuments') ? 'bg-slate-100 opacity-60 border-slate-300' : 'border-[#14a2ba] bg-white'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <Label className={`text-[10px] font-black uppercase ${notRequiredFiles.includes('supportingDocuments') ? 'text-slate-400' : 'text-[#14a2ba]'}`}>
                                                Dokumen Pendukung Lainnya
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={`h-6 text-[9px] px-2 ${notRequiredFiles.includes('supportingDocuments') ? 'bg-red-50 text-red-600 border-red-200' : 'text-[#14a2ba] border-[#14a2ba]/30 hover:bg-[#14a2ba] hover:text-white'}`}
                                                onClick={() => toggleNotRequired('supportingDocuments')}
                                            >
                                                <EyeOff className="h-3 w-3 mr-1" />
                                                {notRequiredFiles.includes('supportingDocuments') ? "Dibutuhkan" : "Tidak Diperlukan"}
                                            </Button>
                                        </div>
                                        {!notRequiredFiles.includes('supportingDocuments') && (
                                            <Input
                                                name="supportingDocuments"
                                                type="file"
                                                multiple
                                                accept=".pdf"
                                                onChange={(e) => handleFileChange('supportingDocuments', !!e.target.files?.length)}
                                                className="h-9 text-[10px] mt-2 file:rounded-md file:bg-[#125d72] file:text-white cursor-pointer"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        {/* 1. Tombol Batal (Selalu Muncul) */}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={isPending}
                        >
                            Batal
                        </Button>

                        {/* LOGIKA KONDISIONAL */}
                        {!isComplete ? (
                            // KONDISI A: Data Belum Lengkap -> Muncul Tombol Draft
                            <Button
                                type="submit"
                                name="actionType"
                                value="draft"
                                variant="outline"
                                disabled={isPending}
                                className="border-slate-300 text-slate-600 hover:bg-slate-50 font-bold px-6 rounded-xl h-12"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Menyimpan Draft...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        <span>Simpan Usulan Agenda (Draft)</span>
                                    </>
                                )}
                            </Button>
                        ) : (
                            // KONDISI B: Data Sudah Lengkap -> Muncul Tombol Lanjutkan (Submit)
                            <Button
                                type="submit"
                                name="actionType"
                                value="submit"
                                disabled={isPending}
                                className="bg-[#125d72] hover:opacity-90 text-white font-bold px-8 shadow-lg min-w-55 transition-all rounded-xl h-12"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        <span>Lanjutkan Rapat</span>
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