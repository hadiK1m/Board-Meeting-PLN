"use client"

import React from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose, // ✅ Import SheetClose
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
    X, // ✅ Import Icon X
} from "lucide-react"
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface AgendaDetail {
    id?: string
    title: string
    urgency: string
    priority?: string | null
    deadline: string | Date
    director?: string | null
    initiator?: string | null
    support?: string | null
    contactPerson?: string | null
    position?: string | null
    phone?: string | null
    legalReview?: string | null
    riskReview?: string | null
    complianceReview?: string | null
    recommendationNote?: string | null
    presentationMaterial?: string | null
    status?: string | null
    cancellationReason?: string | null
}

interface DetailAgendaSheetProps {
    agenda: AgendaDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailAgendaSheet({ agenda, open, onOpenChange }: DetailAgendaSheetProps) {
    if (!agenda) return null

    const handleSecureView = async (path: string) => {
        try {
            const signedUrl = await getSignedFileUrl(path)
            if (!signedUrl) return
            const response = await fetch(signedUrl)
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
            {/* ✅ Layout Konsisten: 100dvh & Flex-Col */}
            <SheetContent
                side="right"
                className="w-full sm:max-w-150 p-0 flex flex-col h-dvh border-none shadow-2xl overflow-hidden"
            >
                {/* ✅ Tombol Close Kustom */}
                <SheetClose className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-all hover:bg-white/20 focus:outline-none active:scale-95">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </SheetClose>

                <SheetHeader className="p-6 md:p-8 bg-[#125d72] text-white shrink-0 z-10 shadow-md relative">
                    <div className="flex justify-between items-start mb-3">
                        <Badge className={cn(
                            "font-bold uppercase text-[10px] border-none px-4 py-1 shadow-sm",
                            agenda.status === "DIBATALKAN"
                                ? "bg-red-500 text-white"
                                : "bg-[#efe62f] text-[#125d72]"
                        )}>
                            {agenda.status?.replace(/_/g, ' ')}
                        </Badge>
                    </div>
                    <SheetTitle className="text-lg md:text-2xl font-black text-white leading-tight uppercase tracking-tight pr-10">
                        {agenda.title}
                    </SheetTitle>
                    <p className="text-[#e7f6f9] text-[11px] md:text-xs italic opacity-80 mt-1">
                        Informasi lengkap agenda yang telah divalidasi
                    </p>
                </SheetHeader>

                <ScrollArea className="flex-1 h-full bg-slate-50 border-t">
                    <div className="p-6 md:p-8 space-y-6 md:space-y-8 pb-32 min-h-0">

                        {/* ALERT: ALASAN PEMBATALAN */}
                        {agenda.status === "DIBATALKAN" && (
                            <div className="p-5 bg-red-50 border border-red-100 rounded-2xl space-y-2 shadow-sm">
                                <div className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <AlertCircle className="h-4 w-4" /> Alasan Pembatalan
                                </div>
                                <p className="text-sm text-red-700 italic font-medium leading-relaxed">
                                    &quot;{agenda.cancellationReason || "Tidak ada alasan spesifik yang dicantumkan."}&quot;
                                </p>
                            </div>
                        )}

                        {/* SECTION 1: STATUS & DEADLINE (Responsive Grid) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoCard
                                icon={Briefcase}
                                label="Urgensi"
                                content={
                                    <Badge variant="outline" className="border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px]">
                                        {agenda.urgency}
                                    </Badge>
                                }
                            />
                            <InfoCard
                                icon={Calendar}
                                label="Deadline Rapat"
                                content={
                                    <p className="text-xs md:text-sm font-black text-[#125d72]">
                                        {agenda.deadline ? format(new Date(agenda.deadline), "dd MMMM yyyy", { locale: id }) : "-"}
                                    </p>
                                }
                            />
                        </div>

                        {/* SECTION 2: PEMRAKARSA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Informasi Pemrakarsa</h4>
                            <div className="grid gap-4 p-5 md:p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <DetailItem label="Direktur Pemrakarsa" value={agenda.director} icon={User} />
                                <DetailItem label="Pemrakarsa" value={agenda.initiator} icon={Briefcase} />
                                <DetailItem label="Support" value={agenda.support} icon={Briefcase} />
                            </div>
                        </div>

                        {/* SECTION 3: NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Narahubung</h4>
                            <div className="grid gap-4 p-5 md:p-6 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <DetailItem label="Nama (Narahubung)" value={agenda.contactPerson} icon={User} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={Info} />
                                <DetailItem label="No hp" value={agenda.phone} icon={Phone} />
                            </div>
                        </div>

                        {/* SECTION 4: LAMPIRAN */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#14a2ba] uppercase tracking-[0.2em] border-b pb-2">Lampiran Dokumen</h4>
                            <div className="grid gap-2">
                                <FileLink label="Kajian Hukum" path={agenda.legalReview} onOpen={handleSecureView} />
                                <FileLink label="Kajian Risiko" path={agenda.riskReview} onOpen={handleSecureView} />
                                <FileLink label="Kajian Kepatuhan" path={agenda.complianceReview} onOpen={handleSecureView} />
                                <FileLink label="Nota Analisa" path={agenda.recommendationNote} onOpen={handleSecureView} />
                                <FileLink label="Materi Presentasi" path={agenda.presentationMaterial} onOpen={handleSecureView} />
                            </div>
                        </div>

                        {/* Extra spacer untuk scroll mobile */}
                        <div className="h-10 invisible" />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

// Reusable Sub-components (Konsisten)
function InfoCard({ label, icon: Icon, content }: { label: string, icon?: LucideIcon, content: React.ReactNode }) {
    return (
        <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {Icon && <Icon className="h-3 w-3 text-[#14a2ba]" />} {label}
            </p>
            {content}
        </div>
    )
}

function DetailItem({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon: LucideIcon }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight wrap-break-word">
                    {value && value !== "" ? value : "Data belum tersedia"}
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
                <span className="text-xs font-bold text-[#125d72] truncate">{label}</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-[#14a2ba] shrink-0" />
        </button>
    )
}