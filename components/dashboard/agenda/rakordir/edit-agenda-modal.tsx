"use client"

import { useState, useEffect } from "react"
import {
    FileEdit,
    FileText,
    Paperclip,
    Loader2,
    X,
    Save,
    User
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

    useEffect(() => {
        setIsClient(true)
        setJudul(agenda.title || "")
    }, [agenda])

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

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b-2 border-[#e7f6f9] pb-2">
                                    <Paperclip className="h-5 w-5 text-[#14a2ba]" />
                                    <h3 className="font-extrabold text-[#125d72] uppercase text-xs tracking-widest">Update Lampiran (Opsional)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 border rounded-xl bg-slate-50">
                                        <Label className="text-[10px] font-black text-[#125d72] uppercase">ND Usulan Agenda (Baru)</Label>
                                        <Input name="proposalNote" type="file" accept=".pdf" className="mt-2 bg-white" />
                                        <p className="text-[9px] text-slate-400 mt-1 italic">*Biarkan kosong jika tidak ingin mengubah file</p>
                                    </div>
                                    <div className="p-4 border rounded-xl bg-slate-50">
                                        <Label className="text-[10px] font-black text-[#125d72] uppercase">Materi Presentasi (Baru)</Label>
                                        <Input name="presentationMaterial" type="file" accept=".pdf" className="mt-2 bg-white" />
                                        <p className="text-[9px] text-slate-400 mt-1 italic">*Biarkan kosong jika tidak ingin mengubah file</p>
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