"use client"

import { useState, useEffect } from "react"
import {
    FileEdit,
    FileText,
    Loader2,
    X,
    Save,
    User,
    Building2,
    HardDrive,
    EyeOff
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

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

import { updateRakordirAction } from "@/server/actions/rakordir-actions"
import { RakordirAgenda } from "./rakordir-client"
import Image from "next/image"
import { cn } from "@/lib/utils"

// ✅ Menghilangkan 'any' dengan mendefinisikan interface yang lengkap
interface ExtendedRakordirAgenda extends RakordirAgenda {
    position?: string | null;
    phone?: string | null;
    director?: string | null;
    // keep same shape as base type
    initiator: string | null;
    support?: string | null;
    // stored as JSON string or array in DB
    notRequiredFiles?: string | string[] | null;
    proposalNote?: string | null;
    presentationMaterial?: string | null;
}

interface EditRakordirModalProps {
    agenda: ExtendedRakordirAgenda
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditRakordirModal({ agenda, open, onOpenChange }: EditRakordirModalProps) {
    const [isPending, setIsPending] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const [judul, setJudul] = useState(agenda.title || "")
    const [notRequired, setNotRequired] = useState<string[]>([])
    const [existingFiles, setExistingFiles] = useState<Record<string, string | null>>({})
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)

    useEffect(() => {
        setIsClient(true)
        setJudul(agenda.title || "")

        // Logika Sinkronisasi Status Dokumen dari Database
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

        // Inisialisasi existingFiles agar UI menampilkan file saat ini (sebelum diubah)
        setExistingFiles({
            proposalNote: agenda.proposalNote ?? null,
            presentationMaterial: agenda.presentationMaterial ?? null,
        })
    }, [agenda])

    const toggleNotRequired = (field: string) => {
        setNotRequired(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])
    }

    if (!isClient) return null

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsPending(true)

        console.log("[CLIENT-DEBUG] Memulai proses update Rakordir ID:", agenda.id)
        const formData = new FormData(event.currentTarget)

        // ✅ ESLint Fix: Menggunakan 'const' karena variabel tidak di-reassign
        console.log("[CLIENT-DEBUG-PAYLOAD] Memeriksa isi data...");
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`- ${key}: File [${value.name}] (${value.size} bytes)`);
            } else {
                console.log(`- ${key}: ${value}`);
            }
        }

        try {
            // Sertakan status dokumen yang tidak dibutuhkan
            formData.append("notRequiredFiles", JSON.stringify(notRequired))

            const result = await updateRakordirAction(formData, agenda.id)

            if (result.success) {
                console.log("[CLIENT-DEBUG] Server Response: SUCCESS")
                toast.custom((t) => (
                    // ✅ Tailwind Fix: Menggunakan min-w-87.5
                    <div className="flex items-center gap-4 bg-white border-l-4 border-[#14a2ba] p-4 shadow-2xl rounded-lg min-w-87.5">
                        <div className="shrink-0">
                            <Image src="/logo-pln.png" alt="PLN" width={40} height={40} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#125d72]">Data Diperbarui</h4>
                            <p className="text-xs text-slate-500 italic">Agenda Rakordir berhasil diupdate.</p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="text-slate-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))
                onOpenChange(false)
            } else {
                console.error("[CLIENT-DEBUG] Server Response: ERROR", result.error)
                toast.error(result.error || "Gagal memperbarui data")
            }
        } catch (error) {
            console.error("[CLIENT-DEBUG] Critical Exception:", error)
            toast.error("Terjadi kesalahan koneksi")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                // ✅ Tailwind Fix: Menggunakan sm:max-w-200
                className="max-w-[95vw] sm:max-w-200 h-[95vh] p-0 flex flex-col border-none shadow-2xl overflow-hidden rounded-t-xl bg-white"
            >
                <DialogHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                        <FileEdit className="h-5 w-5 text-[#efe62f]" /> Edit Usulan Rakordir
                    </DialogTitle>
                    <DialogDescription className="text-[#e7f6f9]/90 italic font-medium">
                        Ubah informasi agenda Rakordir. Kosongkan lampiran jika tidak ingin mengganti file lama.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <ScrollArea className="flex-1 h-0 px-8 py-6 bg-white">
                        <div className="grid gap-10 pb-10">

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <FileText className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-widest">Informasi Utama</h3>
                                </div>
                                <div className="grid gap-3">
                                    <Label className="font-bold text-[#125d72]">Judul Agenda</Label>
                                    <Input
                                        name="title"
                                        value={judul}
                                        onChange={(e) => setJudul(e.target.value)}
                                        required
                                        className="font-semibold"
                                    />
                                    <div className="p-3 bg-[#e7f6f9] border-l-4 border-[#14a2ba] rounded-sm italic text-sm text-[#125d72]">
                                        Preview: &quot;Laporan tentang {judul}&quot;
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Urgensi</Label>
                                        <Input name="urgency" defaultValue={agenda.urgency || ""} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Deadline Rapat</Label>
                                        <Input
                                            name="deadline"
                                            type="date"
                                            defaultValue={agenda.deadline ? format(new Date(agenda.deadline), "yyyy-MM-dd") : ""}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: PEMRAKARSA & SUPPORT */}
                            <div className="space-y-6 mt-8">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <Building2 className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-bold text-[#125d72] uppercase text-xs">Struktur Pemrakarsa</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="font-bold italic text-xs">Direktur Pemrakarsa</Label>
                                        <Input name="director" defaultValue={agenda.director || ""} placeholder="Contoh: Direktur Utama" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold italic text-xs">Divisi Pemrakarsa</Label>
                                        <Input name="initiator" defaultValue={agenda.initiator || ""} placeholder="Contoh: Divisi Hukum" />
                                    </div>
                                    <div className="grid gap-2 md:col-span-2">
                                        <Label className="font-bold italic text-xs text-blue-600">Support (Divisi Terkait)</Label>
                                        <Input name="support" defaultValue={agenda.support || ""} placeholder="Contoh: Divisi Risiko, Divisi Keuangan" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <User className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-widest">Pemrakarsa & Narahubung</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Nama PIC</Label>
                                        <Input name="contactPerson" defaultValue={agenda.contactPerson || ""} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">Jabatan PIC</Label>
                                        <Input name="position" defaultValue={agenda.position || ""} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-[#125d72]">No HP</Label>
                                        <Input name="phone" defaultValue={agenda.phone || ""} required />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: MANAJEMEN DOKUMEN */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <HardDrive className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-bold text-[#125d72] uppercase text-xs">Update Lampiran</h3>
                                </div>

                                <div className="grid gap-4">
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
                            // ✅ Tailwind Fix: Menggunakan min-w-50
                            className={cn(
                                "bg-[#125d72] hover:bg-[#14a2ba] text-white font-bold px-8 shadow-lg min-w-50"
                            )}
                        >
                            {isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
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