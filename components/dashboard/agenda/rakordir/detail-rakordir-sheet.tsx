"use client"

import React from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetClose,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Calendar,
    User,
    Phone,
    Briefcase,
    FileText,
    ExternalLink,
    Info,
    X,
    Paperclip,
    LucideIcon,
    ShieldCheck
} from "lucide-react"
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ✅ Pastikan interface ini mencakup semua field yang dikirim dari Client
export interface RakordirAgendaDetail {
    id?: string
    title: string
    urgency: string | null
    priority?: string | null
    deadline: string | Date | null
    director?: string | null
    initiator?: string | null
    support?: string | null
    contactPerson?: string | null
    position?: string | null
    phone?: string | null
    status?: string | null
    // ✅ Tambahkan ini agar tidak error 2353
    supportingDocuments?: string | string[] | null
    notRequiredFiles?: string[] | string | null
    proposalNote?: string | null
    presentationMaterial?: string | null
}

interface DetailAgendaSheetProps {
    agenda: RakordirAgendaDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailRakordirSheet({ agenda, open, onOpenChange }: DetailAgendaSheetProps) {
    // Lokal tipe untuk mengamankan akses properti database yang bervariasi (snake_case vs camelCase)
    type AgendaExtras = RakordirAgendaDetail & {
        supporting_documents?: string | string[] | null
        proposal_note?: string | null
        presentation_material?: string | null
    }

    const ag = agenda as AgendaExtras | null

    // ✅ Logic Parsing Dokumen Pendukung
    const extraDocs: string[] = React.useMemo(() => {
        const raw = ag?.supportingDocuments ?? ag?.supporting_documents

        if (!raw || raw === "null" || raw === "" || raw === "[]" || raw === '"[]"') return []

        try {
            if (Array.isArray(raw)) return raw.map(String)
            let parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
            if (typeof parsed === 'string') parsed = JSON.parse(parsed)
            return Array.isArray(parsed) ? (parsed as unknown[]).map(String) : []
        } catch (e) {
            console.error("Gagal parse supporting_documents", e)
            return []
        }
    }, [ag])

    if (!agenda) return null

    const handleSecureView = async (path: string) => {
        if (!path || path === "null") return
        try {
            // 1. Dapatkan hasil dari Server Action
            const result = await getSignedFileUrl(path)

            // 2. Cek apakah sukses dan URL-nya ada
            if (!result.success || !result.url) {
                console.error(result.error)
                toast.error("Gagal mendapatkan akses ke dokumen.")
                return
            }

            // 3. Gunakan result.url yang berupa string untuk fetch
            const response = await fetch(result.url)
            if (!response.ok) {
                toast.error("Gagal mengunduh dokumen.")
                return
            }

            // 4. Proses Blob untuk pratinjau aman di tab baru
            const blob = await response.blob()
            const localBlobUrl = URL.createObjectURL(blob)
            window.open(localBlobUrl, '_blank')

            // Bersihkan memori setelah 1 menit
            setTimeout(() => URL.revokeObjectURL(localBlobUrl), 60_000)
        } catch (err) {
            console.error('Error secure view', err)
            toast.error("Terjadi kesalahan sistem.")
        }
    }

    const docs = {
        ndUsulan: ag?.proposalNote || ag?.proposal_note || null,
        materi: ag?.presentationMaterial || ag?.presentation_material || null,
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-150 p-0 flex flex-col h-dvh border-none shadow-2xl overflow-hidden bg-white"
            >
                <SheetClose className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 focus:outline-none">
                    <X className="h-5 w-5" />
                </SheetClose>

                <SheetHeader className="p-6 md:p-8 bg-[#125d72] text-white shrink-0 z-10 shadow-md relative">
                    <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-[#efe62f] text-[#125d72] font-bold uppercase text-[10px] px-3 py-1 border-none shadow-sm">
                            {agenda.status?.replace(/_/g, " ") || "DRAFT"}
                        </Badge>
                    </div>
                    <SheetTitle className="text-lg md:text-2xl font-black text-white leading-tight uppercase tracking-tight pr-10 italic">
                        {agenda.title}
                    </SheetTitle>
                    <SheetDescription className="text-[#e7f6f9] text-[11px] md:text-xs italic opacity-80 mt-1">
                        Sistem Board Meeting PLN - Detail Usulan Agenda Rakordir
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0 bg-slate-50 border-t">
                    <div className="p-6 md:p-8 space-y-6 md:space-y-8 pb-32">

                        {/* SECTION 1: INFO UTAMA */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="col-span-1 md:col-span-2">
                                <InfoCard
                                    label="Urgensi"
                                    icon={ShieldCheck}
                                    content={
                                        <Badge
                                            variant="outline"
                                            className="rounded-xl border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px] whitespace-normal text-left leading-tight py-2 h-auto w-full block wrap-break-word"
                                        >
                                            {agenda.urgency || "NORMAL"}
                                        </Badge>
                                    }
                                />
                            </div>

                            <InfoCard label="Deadline" icon={Calendar} content={
                                <p className="text-xs md:text-sm font-black text-[#125d72]">
                                    {agenda.deadline ? format(new Date(agenda.deadline), "dd MMM yyyy", { locale: id }) : "-"}
                                </p>
                            } />

                            <InfoCard label="Prioritas" icon={Info} content={
                                <div className={cn(
                                    "text-[10px] font-black italic px-2 py-0.5 rounded border w-fit uppercase",
                                    agenda.priority === 'High' ? 'text-red-600 bg-red-50 border-red-200' :
                                        agenda.priority === 'Medium' ? 'text-orange-500 bg-orange-50 border-orange-200' :
                                            'text-green-600 bg-green-50 border-green-200'
                                )}>
                                    {agenda.priority ?? 'Low'}
                                </div>
                            } />
                        </div>

                        {/* SECTION 2: PEMRAKARSA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-l-4 border-[#efe62f] pl-3">Informasi Pemrakarsa</h4>
                            <div className="grid gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <DetailItem label="Direktur Pemrakarsa" value={agenda.director} icon={<User className="h-4 w-4" />} />
                                <DetailItem label="Unit Pemrakarsa" value={agenda.initiator} icon={<Briefcase className="h-4 w-4" />} />
                                <DetailItem label="Unit Support" value={agenda.support} icon={<ShieldCheck className="h-4 w-4" />} />
                            </div>
                        </div>

                        {/* SECTION 3: NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-l-4 border-[#14a2ba] pl-3">Narahubung & Jabatan</h4>
                            <div className="grid gap-4 p-5 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <DetailItem label="Nama PIC" value={agenda.contactPerson} icon={<User className="h-4 w-4" />} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={<Briefcase className="h-4 w-4" />} />
                                <DetailItem label="No HP" value={agenda.phone} icon={<Phone className="h-4 w-4" />} />
                            </div>
                        </div>

                        {/* SECTION 4: LAMPIRAN */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#14a2ba] uppercase tracking-[0.2em] border-b pb-2">Lampiran Dokumen Rakordir</h4>
                            <div className="grid gap-2">
                                <FileLink label="ND Usulan Agenda" path={docs.ndUsulan} onOpen={handleSecureView} />
                                <FileLink label="Materi Presentasi" path={docs.materi} onOpen={handleSecureView} />

                                {extraDocs.map((docPath, index) => (
                                    <FileLink
                                        key={`extra-${index}`}
                                        label={`Dokumen Pendukung ${index + 1}`}
                                        path={docPath}
                                        onOpen={handleSecureView}
                                        isExtra
                                    />
                                ))}

                                {!docs.ndUsulan && !docs.materi && extraDocs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Paperclip className="h-8 w-8 text-slate-200 mb-2" />
                                        <p className="text-[10px] text-slate-400 italic text-center">
                                            Belum ada lampiran dokumen yang diunggah.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-10 w-full" />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

function InfoCard({ label, icon: Icon, content }: { label: string, icon: LucideIcon, content: React.ReactNode }) {
    return (
        <div className="p-3 md:p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-2 hover:border-[#14a2ba]/30 transition-colors h-full">
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
                <Icon className="h-3 w-3 text-[#14a2ba]" /> {label}
            </p>
            <div className="w-full">
                {content}
            </div>
        </div>
    )
}

function DetailItem({ label, value, icon }: { label: string, value: string | null | undefined, icon: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 group">
            <div className="mt-1 text-[#14a2ba] opacity-50 shrink-0 group-hover:opacity-100 transition-opacity">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight wrap-break-word uppercase">
                    {value || "-"}
                </p>
            </div>
        </div>
    )
}

function FileLink({ label, path, onOpen, isExtra }: { label: string, path: string | null | undefined, onOpen: (path: string) => Promise<void>, isExtra?: boolean }) {
    if (!path || path === "null" || path === "" || path === "[]") return null

    return (
        <button
            type="button"
            onClick={() => onOpen(path)}
            className={cn(
                "w-full flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all group shadow-sm active:scale-[0.98]",
                isExtra ? "bg-slate-50 border-slate-200 hover:bg-slate-100" : "bg-white hover:bg-[#e7f6f9] hover:border-[#14a2ba]"
            )}
        >
            <div className="flex items-center gap-3 truncate">
                <div className={cn("p-2 rounded-lg", isExtra ? "bg-slate-200 text-slate-500" : "bg-[#14a2ba]/10 text-[#14a2ba]")}>
                    {isExtra ? <Paperclip className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="flex flex-col items-start truncate text-left">
                    <span className={cn("text-[11px] md:text-xs font-bold truncate uppercase tracking-tight", isExtra ? "text-slate-600" : "text-[#125d72]")}>
                        {label}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">Klik untuk melihat dokumen</span>
                </div>
            </div>
            <div className="bg-slate-50 group-hover:bg-white p-1.5 rounded-full border border-transparent group-hover:border-slate-100 transition-all">
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#14a2ba]" />
            </div>
        </button>
    )
}