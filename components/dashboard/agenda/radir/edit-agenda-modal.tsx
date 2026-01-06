"use client"

import { useState, useEffect } from "react"
import { FileEdit, Loader2, X, FileText, Briefcase, Paperclip, EyeOff } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Select, { StylesConfig, MultiValue } from "react-select"
import { differenceInDays } from "date-fns"

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

import { updateAgendaAction } from "@/server/actions/agenda-actions"
import { DIREKTURE_PEMRAKARSA, PEMRAKARSA, SUPPORT, extractCode } from "@/lib/MasterData"

interface AgendaEdit {
    id: string
    title?: string
    urgency?: string
    deadline?: string | Date
    priority?: string | null
    director?: string | null
    initiator?: string | null
    support?: string | null
    contactPerson?: string | null
    position?: string | null
    phone?: string | null
    legalReview?: string | null
    riskReview?: string | null
    complianceReview?: string | null
    regulationReview?: string | null
    recommendationNote?: string | null
    proposalNote?: string | null
    presentationMaterial?: string | null
    notRequiredFiles?: string[] | null
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

export function EditAgendaModal({ agenda, open, onOpenChange }: { agenda: AgendaEdit | null, open: boolean, onOpenChange: (o: boolean) => void }) {
    const [isPending, setIsPending] = useState(false)
    const [prioritas, setPrioritas] = useState<string>("Low")

    const [selectedDir, setSelectedDir] = useState<Option[]>([])
    const [selectedPemrakarsa, setSelectedPemrakarsa] = useState<Option[]>([])
    const [selectedSupport, setSelectedSupport] = useState<Option[]>([])

    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({})
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)

    // State untuk melacak file yang tidak diperlukan
    const [notRequiredFiles, setNotRequiredFiles] = useState<string[]>([])

    useEffect(() => {
        if (agenda && open) {
            setPrioritas(agenda.priority ?? "Low")
            setSelectedDir((agenda.director ?? "").split(/,\s*/).filter(Boolean).map(d => ({ label: d, value: d })))
            setSelectedPemrakarsa((agenda.initiator ?? "").split(/,\s*/).filter(Boolean).map(i => ({ label: i, value: i })))
            setSelectedSupport((agenda.support ?? "").split(/,\s*/).filter(Boolean).map(s => ({ label: s, value: s })))

            setExistingFiles({
                legalReview: agenda.legalReview ?? null,
                riskReview: agenda.riskReview ?? null,
                complianceReview: agenda.complianceReview ?? null,
                regulationReview: agenda.regulationReview ?? null,
                recommendationNote: agenda.recommendationNote ?? null,
                proposalNote: agenda.proposalNote ?? null,
                presentationMaterial: agenda.presentationMaterial ?? null,
            })

            // Sinkronkan notRequiredFiles dari database
            setNotRequiredFiles(agenda.notRequiredFiles ?? [])
        }
    }, [agenda, open])

    const handleDeadlineChange = (val: string) => {
        if (!val) return
        const days = differenceInDays(new Date(val), new Date())
        if (days <= 7) setPrioritas("High")
        else if (days <= 14) setPrioritas("Medium")
        else setPrioritas("Low")
    }

    const toggleNotRequired = (fieldId: string) => {
        setNotRequiredFiles(prev =>
            prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
        )
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)

        const formData = new FormData(event.currentTarget)
        formData.set("director", selectedDir.map(item => extractCode(item.value)).join(", "))
        formData.set("initiator", selectedPemrakarsa.map(item => extractCode(item.value)).join(", "))
        formData.set("support", selectedSupport.map(item => extractCode(item.value)).join(", "))
        formData.set("priority", prioritas)

        // Kirimkan state notRequiredFiles terbaru ke server
        formData.set("notRequiredFiles", JSON.stringify(notRequiredFiles))

        try {
            const fileFields = [
                'legalReview', 'riskReview', 'complianceReview', 'regulationReview',
                'recommendationNote', 'proposalNote', 'presentationMaterial'
            ]

            for (const f of fileFields) {
                const originalPath = (agenda as unknown as Record<string, string | null>)[f]
                const current = existingFiles[f]
                if (originalPath && current === null) {
                    formData.append(`delete_${f}`, 'true')
                }
            }

            const result = await updateAgendaAction(agenda!.id, formData)
            if (result.success) {
                toast.custom((t) => (
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg">
                        <Image src="/logo-pln.png" alt="PLN" width={40} height={40} />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Berhasil Diperbarui</h4>
                            <p className="text-xs text-slate-500 italic">Data agenda telah diperbarui di sistem.</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)}><X className="h-4 w-4 text-slate-300 hover:text-red-500" /></button>
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
            <DialogContent className="max-w-[95vw] sm:max-w-[800px] h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl">
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase">
                        <FileEdit className="h-5 w-5 text-[#efe62f]" /> Ubah Usulan Agenda
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6 bg-white" type="scroll">
                        <div className="grid gap-10 pb-10">

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Informasi Utama</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72]">Judul Agenda</Label>
                                    <Input name="title" defaultValue={agenda.title} required placeholder="Masukkan judul agenda rapat..." />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Urgensi</Label>
                                        <Input name="urgency" defaultValue={agenda.urgency} placeholder="Sangat Segera / Normal" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Deadline Rapat</Label>
                                        <Input
                                            name="deadline" type="date"
                                            defaultValue={agenda.deadline ? new Date(agenda.deadline).toISOString().split('T')[0] : ""}
                                            onChange={(e) => handleDeadlineChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Prioritas</Label>
                                        <div className="h-10 flex items-center px-4 border-2 rounded-md bg-[#f8fafc] font-black italic text-xs">
                                            <span className={prioritas === 'High' ? 'text-red-600' : prioritas === 'Medium' ? 'text-orange-500' : 'text-green-600'}>
                                                {prioritas}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <PlusCircle className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">PEMRAKARSA & NARAHUBUNG</h3>
                                </div>
                                <div className="grid gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Direktur Pemrakarsa</Label>
                                        <Select isMulti styles={selectStyles} options={DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }))} value={selectedDir} onChange={v => setSelectedDir(v as Option[])} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Pemrakarsa</Label>
                                        <Select isMulti styles={selectStyles} options={PEMRAKARSA.map(p => ({ label: p, value: p }))} value={selectedPemrakarsa} onChange={v => setSelectedPemrakarsa(v as Option[])} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Support</Label>
                                        <Select isMulti styles={selectStyles} options={SUPPORT.map(s => ({ label: s, value: s }))} value={selectedSupport} onChange={v => setSelectedSupport(v as Option[])} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="grid gap-2"><Label className="font-bold text-[#125d72]">Narahubung</Label><Input name="contactPerson" defaultValue={agenda.contactPerson ?? ""} required /></div>
                                        <div className="grid gap-2"><Label className="font-bold text-[#125d72]">Jabatan</Label><Input name="position" defaultValue={agenda.position ?? ""} required /></div>
                                        <div className="grid gap-2"><Label className="font-bold text-[#125d72]">No HP/WA</Label><Input name="phone" defaultValue={agenda.phone ?? ""} required /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-[0.2em]">Lampiran Dokumen (PDF)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: "legalReview", label: "Kajian Hukum" },
                                        { id: "riskReview", label: "Kajian Risiko" },
                                        { id: "complianceReview", label: "Kajian Kepatuhan" },
                                        { id: "regulationReview", label: "Kajian Regulasi" },
                                        { id: "recommendationNote", label: "Nota Analisa Rekomendasi" },
                                        { id: "proposalNote", label: "ND Usulan Agenda" },
                                        { id: "presentationMaterial", label: "Materi Presentasi" },
                                    ].map((doc) => (
                                        <div key={doc.id} className={`p-4 rounded-lg border transition-all group shadow-sm ${notRequiredFiles.includes(doc.id) ? 'bg-slate-100 opacity-60' : 'bg-[#fcfcfc] hover:bg-[#e7f6f9]/30'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="text-[10px] font-black text-[#125d72] uppercase opacity-70 group-hover:opacity-100">{doc.label}</Label>

                                                {/* Tombol Toggle "Dibutuhkan" jika statusnya "Tidak Diperlukan" */}
                                                {!existingFiles[doc.id] && (
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
                                                                        File akan dihapus dari bucket dan database ketika Anda menekan &quot;Ya, hapus&quot;. Tindakan ini tidak dapat dibatalkan setelah disimpan.
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
                                                    {!notRequiredFiles.includes(doc.id) ? (
                                                        <Input name={doc.id} type="file" accept=".pdf" className="h-9 text-[10px] mt-2 file:mr-2.5 file:pr-1.5 file:pl-1.5 file:bg-[#14a2ba] file:text-white file:border-none file:rounded-md cursor-pointer" />
                                                    ) : (
                                                        <div className="h-9 flex items-center text-[10px] italic text-slate-400">Dokumen ditandai tidak diperlukan</div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {/* DOKUMEN PENDUKUNG LAINNYA */}
                                    <div className={`p-4 rounded-lg border-2 border-dashed col-span-1 md:col-span-2 transition-all shadow-inner ${notRequiredFiles.includes('supportingDocuments') ? 'bg-slate-100 opacity-60 border-slate-300' : 'border-[#14a2ba] bg-white'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <Label className={`text-[10px] font-black uppercase ${notRequiredFiles.includes('supportingDocuments') ? 'text-slate-400' : 'text-[#14a2ba]'}`}>
                                                Dokumen Pendukung (Multi-File)
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
                                        {!notRequiredFiles.includes('supportingDocuments') ? (
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
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
                        <Button type="submit" disabled={isPending} className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-bold px-8 shadow-lg min-w-45">
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

const PlusCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>
);