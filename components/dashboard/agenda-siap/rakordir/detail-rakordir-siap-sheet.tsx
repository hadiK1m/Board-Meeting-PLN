"use client"

import React from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Calendar,
    Briefcase,
    FileText,
    ExternalLink,
    AlertCircle,
    User,
    Phone,
    LucideIcon,
    Info,
    X,
    ShieldCheck,
    Clock,
    Building2
} from "lucide-react"
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"

// ✅ Tipe Data Rakordir yang disesuaikan
interface AgendaDetail {
    id: string
    title: string
    urgency: string
    priority?: string | null
    deadline: string | Date
    status: string
    initiator: string
    contactPerson: string
    director?: string | null
    support?: string | null
    position?: string | null
    phone?: string | null
    proposalNote?: string | null
    presentationMaterial?: string | null
    cancellationReason?: string | null
    postponedReason?: string | null
}

interface DetailRakordirSiapSheetProps {
    agenda: AgendaDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailRakordirSiapSheet({ agenda, open, onOpenChange }: DetailRakordirSiapSheetProps) {
    if (!agenda) return null

    // ✅ Fungsi Secure View Identik dengan Radir
    const handleSecureView = async (path: string) => {
        try {
            const result = await getSignedFileUrl(path)
            if (!result.success || !result.url) {
                console.error(result.error)
                return
            }
            const response = await fetch(result.url)
            if (!response.ok) return
            const blob = await response.blob()
            const localBlobUrl = URL.createObjectURL(blob)
            window.open(localBlobUrl, '_blank')
            setTimeout(() => URL.revokeObjectURL(localBlobUrl), 60_000)
        } catch (err) {
            console.error('Error secure view', err)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-150 p-0 flex flex-col h-dvh border-none shadow-2xl overflow-hidden bg-white"
            >
                {/* TOMBOL CLOSE OVERLAY */}
                <SheetClose className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-all hover:bg-white/20 focus:outline-none active:scale-95">
                    <X className="h-5 w-5" />
                </SheetClose>

                {/* HEADER: Solid Dark Teal (Identik Radir) */}
                <SheetHeader className="p-6 md:p-8 bg-[#125d72] text-white shrink-0 z-10 shadow-md relative">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2">
                            <Badge className="bg-[#14a2ba] text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                RAKORDIR
                            </Badge>
                            <Badge className={cn(
                                "font-bold uppercase text-[10px] border-none px-4 py-1 shadow-sm",
                                // Sinkronisasi Warna
                                agenda.status === "DIBATALKAN" ? "bg-red-500 text-white" :
                                    agenda.status === "DITUNDA" ? "bg-amber-500 text-white" :
                                        "bg-[#efe62f] text-[#125d72]" // Warna Kuning Terang PLN untuk Dijadwalkan/Aktif
                            )}>
                                {agenda.status?.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                    </div>
                    <SheetTitle className="text-lg md:text-2xl font-black text-white leading-tight uppercase tracking-tight pr-10">
                        {agenda.title}
                    </SheetTitle>
                    <p className="text-[#e7f6f9] text-[11px] md:text-xs italic opacity-80 mt-1">
                        Informasi lengkap agenda RAKORDIR yang telah divalidasi
                    </p>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0 bg-slate-50 border-t">
                    <div className="p-6 md:p-8 space-y-6 md:space-y-8 pb-40">

                        {/* --- ALERT: ALASAN PEMBATALAN --- */}
                        {agenda.status === "DIBATALKAN" && (
                            <div className="p-5 bg-red-50 border border-red-100 rounded-2xl space-y-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <AlertCircle className="h-4 w-4" /> Alasan Pembatalan
                                </div>
                                <p className="text-sm text-red-700 italic font-medium leading-relaxed">
                                    &quot;{agenda.cancellationReason || "Tidak ada alasan spesifik yang dicantumkan."}&quot;
                                </p>
                            </div>
                        )}

                        {/* --- ALERT: ALASAN PENUNDAAN --- */}
                        {agenda.status === "DITUNDA" && (
                            <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl space-y-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <Clock className="h-4 w-4" /> Alasan Penundaan
                                </div>
                                <p className="text-sm text-amber-700 italic font-medium leading-relaxed">
                                    &quot;{agenda.postponedReason || "Tidak ada alasan penundaan yang dicantumkan."}&quot;
                                </p>
                            </div>
                        )}

                        {/* SECTION 1: INFO UTAMA (InfoCard Layout) */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="col-span-1 md:col-span-2">
                                <InfoCard
                                    icon={Briefcase}
                                    label="Urgensi Usulan"
                                    content={
                                        <Badge variant="outline" className="border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px] whitespace-normal text-left h-auto py-1.5 leading-tight">
                                            {agenda.urgency}
                                        </Badge>
                                    }
                                />
                            </div>
                            <InfoCard
                                icon={Calendar}
                                label="Deadline Usulan"
                                content={<p className="text-xs md:text-sm font-black text-[#125d72]">{format(new Date(agenda.deadline), "dd MMMM yyyy", { locale: id })}</p>}
                            />
                            <InfoCard
                                icon={ShieldCheck}
                                label="Prioritas"
                                content={
                                    <div className={cn(
                                        "text-[10px] font-black italic px-3 py-1 rounded-md border w-fit uppercase tracking-wider",
                                        agenda.priority === 'High' ? 'text-red-600 bg-red-50 border-red-200' :
                                            agenda.priority === 'Medium' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                                                'text-green-600 bg-green-50 border-green-200'
                                    )}>
                                        {agenda.priority || 'Low'}
                                    </div>
                                }
                            />
                        </div>

                        {/* SECTION 2: PEMRAKARSA (DetailItem Layout) */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-l-4 border-[#14a2ba] pl-3">Struktur Pemrakarsa</h4>
                            <div className="grid gap-4 p-5 md:p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <DetailItem label="Direktur Pemrakarsa" value={agenda.director} icon={User} />
                                <DetailItem label="Divisi Pemrakarsa" value={agenda.initiator} icon={Building2} />
                                <DetailItem label="Divisi Support" value={agenda.support} icon={Briefcase} />
                            </div>
                        </div>

                        {/* SECTION 3: NARAHUBUNG (Dashed Layout) */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-l-4 border-[#14a2ba] pl-3">Narahubung (PIC)</h4>
                            <div className="grid gap-4 p-5 md:p-6 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <DetailItem label="Nama Lengkap" value={agenda.contactPerson} icon={User} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={Info} />
                                <DetailItem label="Kontak / No. HP" value={agenda.phone} icon={Phone} />
                            </div>
                        </div>

                        {/* SECTION 4: BERKAS RAKORDIR (Hanya yang relevan untuk Rakordir) */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#14a2ba] uppercase tracking-[0.2em] border-l-4 border-[#14a2ba] pl-3">
                                Berkas Rakordir
                            </h4>
                            <div className="grid gap-2">
                                {/* Cek jika kedua file utama kosong */}
                                {!(agenda.proposalNote || agenda.presentationMaterial) ? (
                                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                        <FileText className="h-8 w-8 text-slate-300 mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                            Belum ada dokumen utama (Nota/Materi) yang diunggah
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Nota Proposal adalah dokumen wajib/utama di Rakordir */}
                                        <FileLink
                                            label="Nota Usulan Agenda (ND)"
                                            path={agenda.proposalNote}
                                            onOpen={handleSecureView}
                                        />

                                        {/* Materi Presentasi jika sudah tersedia */}
                                        <FileLink
                                            label="Materi Presentasi"
                                            path={agenda.presentationMaterial}
                                            onOpen={handleSecureView}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="h-20 w-full" />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

// ────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS (IDENTIK DENGAN RADIR)
// ────────────────────────────────────────────────

function InfoCard({ label, icon: Icon, content }: { label: string, icon?: LucideIcon, content: React.ReactNode }) {
    return (
        <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center h-full min-h-20">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                {Icon && <Icon className="h-3 w-3 text-[#14a2ba]" />} {label}
            </p>
            {content}
        </div>
    )
}

function DetailItem({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon: LucideIcon }) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0 group-hover:opacity-100 transition-opacity">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight wrap-break-word">
                    {value && value !== "" ? value : "-"}
                </p>
            </div>
        </div>
    )
}

function FileLink({ label, path, onOpen }: { label: string, path: string | null | undefined, onOpen: (path: string) => Promise<void> }) {
    if (!path) return null
    return (
        <button
            type="button"
            onClick={() => onOpen(path)}
            className="w-full flex items-center justify-between p-4 rounded-xl border bg-white hover:bg-[#e7f6f9] hover:border-[#14a2ba] transition-all group shadow-sm active:scale-[0.98]"
        >
            <div className="flex items-center gap-3 truncate">
                <FileText className="h-4 w-4 text-slate-400 group-hover:text-[#14a2ba] shrink-0" />
                <span className="text-xs font-bold text-[#125d72] truncate uppercase tracking-tight">{label}</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-[#14a2ba] shrink-0" />
        </button>
    )
}