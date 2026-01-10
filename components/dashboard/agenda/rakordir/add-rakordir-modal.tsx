"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, FileText, Paperclip, Loader2, X, EyeOff, Send, Eye } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

import { createRakordirAction } from "@/server/actions/rakordir-actions"
import {
    DIREKTURE_PEMRAKARSA,
    PEMRAKARSA,
    SUPPORT,
    extractCode
} from "@/lib/MasterData"

// Interface untuk React-Select Options
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

export function AddRakordirModal() {
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    const [judul, setJudul] = useState("")
    const [deadline, setDeadline] = useState("")
    const [prioritas, setPrioritas] = useState("Low")

    const [notRequiredFiles, setNotRequiredFiles] = useState<string[]>([])
    const [fileStatus, setFileStatus] = useState<Record<string, boolean>>({})

    const [selectedDir, setSelectedDir] = useState<MultiValue<Option>>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<MultiValue<Option>>([])
    const [selectedSupport, setSelectedSupport] = useState<MultiValue<Option>>([])

    const dirOptions: Option[] = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));
    const pemOptions: Option[] = PEMRAKARSA.map(p => ({ label: p, value: p }));
    const supOptions: Option[] = SUPPORT.map(s => ({ label: s, value: s }));

    const FILE_LIST = [
        { id: "proposalNote", label: "ND Usulan Agenda" },
        { id: "presentationMaterial", label: "Materi Presentasi" },
    ];

    useEffect(() => {
        setMounted(true)
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

    // ✅ Logika isComplete yang diperhitungkan secara real-time
    const isComplete = useMemo(() => {
        const docWajibOk = FILE_LIST.every(doc => fileStatus[doc.id] || notRequiredFiles.includes(doc.id));
        const pendukungOk = fileStatus["supportingDocuments"] || notRequiredFiles.includes("supportingDocuments");
        return docWajibOk && pendukungOk;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileStatus, notRequiredFiles]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        // ✅ Penyesuaian Data Multi-Select
        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("support", selectedSupport.map(item => extractCode(item.value)).join(", "))
        formData.set("priority", prioritas)

        // ✅ Logika Not Required & Status (Poin Utama Perbaikan)
        formData.set("notRequiredFiles", JSON.stringify(notRequiredFiles))
        formData.set("status", isComplete ? "DAPAT_DILANJUTKAN" : "DRAFT")
        formData.set("meetingType", "RAKORDIR")

        try {
            const result = await createRakordirAction(formData)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg min-w-87.5 animate-in slide-in-from-bottom-5">
                        <div className="shrink-0">
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} className="object-contain" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Data Berhasil Disimpan</h4>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                                Status: {isComplete ? "Siap Risalah (Dapat Dilanjutkan)" : "Draft"}
                            </p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ), { duration: 5000 })

                setOpen(false)
                resetForm()
                router.refresh()
            } else {
                toast.error(result.error || "Gagal menyimpan data")
            }
        } catch {
            toast.error("Gagal terhubung ke server")
        } finally {
            setIsPending(false)
        }
    }

    if (!mounted) return null

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="bg-[#14a2ba] hover:bg-[#125d72] text-white shadow-lg font-bold h-11 px-6 rounded-xl transition-all active:scale-95 uppercase text-xs tracking-wider">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Usulan Rakordir
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                                <PlusCircle className="h-5 w-5 text-[#efe62f]" /> Form Usulan Agenda Rakordir
                            </DialogTitle>
                            <DialogDescription className="text-[#e7f6f9]/90 italic font-medium text-xs">
                                &quot;Pastikan seluruh dokumen ND Usulan & Materi sudah terlampir&quot;
                            </DialogDescription>
                        </div>
                        <Badge className={cn("border-none px-3 py-1 text-[10px] uppercase font-bold", isComplete ? "bg-emerald-500 text-white" : "bg-amber-400 text-[#125d72]")}>
                            {isComplete ? "Mode: Siap Risalah" : "Mode: Draft"}
                        </Badge>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6" type="scroll">
                        <div className="grid gap-10 pb-10">
                            {/* SECTION 1: INFORMASI UTAMA */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Informasi Utama Agenda</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72] uppercase text-[11px]">Judul Agenda</Label>
                                    <Input value={judul} onChange={(e) => setJudul(e.target.value)} name="title" required className="h-11 border-slate-200" />
                                    {judul && (
                                        <div className="p-4 bg-[#e7f6f9] border-l-4 border-[#14a2ba] rounded-sm animate-in fade-in slide-in-from-top-1">
                                            <p className="text-[10px] font-bold text-[#125d72] uppercase opacity-60 tracking-wider">Preview Teks Surat:</p>
                                            <p className="text-sm font-semibold text-[#125d72] mt-1 italic leading-relaxed uppercase">
                                                &quot;Laporan tentang {judul}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72] text-xs uppercase">Urgensi</Label><Input name="urgency" placeholder="Sangat Segera" defaultValue="Sangat Segera" required className="h-11" /></div>
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72] text-xs uppercase">Deadline Rapat</Label><Input name="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required className="h-11" /></div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] text-xs uppercase">Prioritas Sistem</Label>
                                        <div className="h-11 flex items-center px-4 border-2 rounded-md bg-[#f8fafc] font-black italic text-xs shadow-inner">
                                            <span className={cn(prioritas === 'High' ? 'text-red-600' : prioritas === 'Medium' ? 'text-orange-500' : 'text-green-600')}>
                                                {prioritas.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: PEMRAKARSA & NARAHUBUNG */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <PlusCircle className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">PEMRAKARSA & NARAHUBUNG</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] text-xs uppercase">Direktur Pemrakarsa</Label>
                                        <Select isMulti options={dirOptions} styles={selectStyles} value={selectedDir} onChange={setSelectedDir} placeholder="Pilih Direktur..." />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] text-xs uppercase">Pemrakarsa (Divisi/Unit)</Label>
                                        <Select isMulti options={pemOptions} styles={selectStyles} value={selectedPemrakarsa} onChange={setSelectedPemrakarsa} placeholder="Pilih Pemrakarsa..." />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72] text-xs uppercase">Unit Support</Label>
                                        <Select isMulti options={supOptions} styles={selectStyles} value={selectedSupport} onChange={setSelectedSupport} placeholder="Pilih Unit Support..." />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72] text-xs uppercase">Narahubung</Label><Input name="contactPerson" placeholder="Nama PIC" required className="h-11" /></div>
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72] text-xs uppercase">Jabatan</Label><Input name="position" placeholder="Contoh: Manager" required className="h-11" /></div>
                                    <div className="grid gap-2"><Label className="font-bold text-[#125d72] text-xs uppercase">No WhatsApp</Label><Input name="phone" type="number" placeholder="628123..." required className="h-11" /></div>
                                </div>
                            </div>

                            {/* SECTION 3: LAMPIRAN DOKUMEN */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Lampiran Dokumen (PDF)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {FILE_LIST.map((doc) => (
                                        <div key={doc.id} className={cn("p-4 rounded-xl border transition-all shadow-sm", notRequiredFiles.includes(doc.id) ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-[#14a2ba]/30 hover:border-[#14a2ba]')}>
                                            <div className="flex justify-between items-center mb-3">
                                                <Label className="text-[10px] font-black text-[#125d72] uppercase">{doc.label}</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-7 text-[9px] px-2 font-bold",
                                                        // Jika sudah ada di array (artinya tidak diperlukan), beri warna biru/aktif
                                                        notRequiredFiles.includes(doc.id)
                                                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                            : 'text-slate-400'
                                                    )}
                                                    onClick={() => toggleNotRequired(doc.id)}
                                                >
                                                    {/* LOGIKA TEKS TERBALIK SEBELUMNYA, INI PERBAIKANNYA: */}
                                                    {notRequiredFiles.includes(doc.id) ? (
                                                        <>
                                                            <Eye className="h-3 w-3 mr-1" /> {/* Ikon mata buka: Tandai jadi Perlu lagi */}
                                                            Dibutuhkan
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff className="h-3 w-3 mr-1" /> {/* Ikon mata coret: Tandai Tidak Perlu */}
                                                            Tidak Diperlukan
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            {!notRequiredFiles.includes(doc.id) && (
                                                <Input name={doc.id} type="file" accept=".pdf" onChange={(e) => handleFileChange(doc.id, !!e.target.files?.[0])} className="h-9 text-[10px] file:bg-[#14a2ba] file:text-white file:border-none file:rounded-md cursor-pointer" />
                                            )}
                                        </div>
                                    ))}

                                    {/* DOKUMEN PENDUKUNG */}
                                    <div className={cn("p-4 rounded-xl border-2 border-dashed col-span-1 md:col-span-2 transition-all", notRequiredFiles.includes('supportingDocuments') ? 'bg-slate-50 border-slate-200 opacity-60' : 'border-[#14a2ba] bg-[#e7f6f9]/5')}>
                                        <div className="flex justify-between items-center mb-3">
                                            <Label className="text-[10px] font-black uppercase text-[#14a2ba]">Dokumen Pendukung Lainnya (Opsional)</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-7 text-[9px] px-2 font-bold",
                                                    notRequiredFiles.includes('supportingDocuments')
                                                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                        : 'text-[#14a2ba] border-[#14a2ba]/30'
                                                )}
                                                onClick={() => toggleNotRequired('supportingDocuments')}
                                            >
                                                {notRequiredFiles.includes('supportingDocuments') ? "Dibutuhkan" : "Tidak Diperlukan"}
                                            </Button>
                                        </div>
                                        {!notRequiredFiles.includes('supportingDocuments') && (
                                            <Input name="supportingDocuments" type="file" multiple accept=".pdf" onChange={(e) => handleFileChange('supportingDocuments', !!e.target.files?.length)} className="h-10 text-[10px] file:bg-[#125d72] file:text-white cursor-pointer" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-[#f8fafc] border-t shrink-0 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-bold text-slate-400 uppercase text-xs hover:bg-slate-100">Batal</Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className={cn("h-12 px-10 font-black uppercase tracking-widest shadow-xl transition-all min-w-64 rounded-xl", isComplete ? 'bg-[#125d72] hover:bg-[#0e4b5d]' : 'bg-[#14a2ba] hover:bg-[#118a9e]', "text-white")}
                        >
                            {isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                            ) : isComplete ? (
                                <><Send className="mr-2 h-4 w-4" /> Lanjutkan Rapat</>
                            ) : (
                                <><FileText className="mr-2 h-4 w-4" /> Simpan Sebagai Draft</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}