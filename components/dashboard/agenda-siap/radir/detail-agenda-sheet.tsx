"use client"

import React from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
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
            <SheetContent className="sm:max-w-150 p-0 flex flex-col gap-0 border-none shadow-2xl">
                <SheetHeader className="p-6 bg-[#125d72] text-white shrink-0">
                    <div className="flex justify-between items-start pt-4">
                        <Badge className={cn(
                            "font-bold uppercase text-[10px] border-none",
                            agenda.status === "DIBATALKAN"
                                ? "bg-red-500 text-white"
                                : "bg-[#efe62f] text-[#125d72]"
                        )}>
                            {agenda.status?.replace(/_/g, ' ')}
                        </Badge>
                    </div>
                    <SheetTitle className="text-white text-xl font-bold leading-tight mt-2 uppercase">
                        {agenda.title}
                    </SheetTitle>
                    <p className="text-[#e7f6f9] text-xs italic opacity-80 mt-1">
                        Informasi lengkap agenda yang telah divalidasi
                    </p>
                </SheetHeader>

                <ScrollArea className="flex-1 bg-white">
                    <div className="p-6 space-y-8 pb-10">

                        {/* ALERT SECTION: ALASAN PEMBATALAN */}
                        {agenda.status === "DIBATALKAN" && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">
                                    <AlertCircle className="h-3 w-3" /> Alasan Pembatalan
                                </div>
                                <p className="text-sm text-red-700 italic font-medium leading-relaxed">
                                    &quot;{agenda.cancellationReason || "Tidak ada alasan spesifik yang dicantumkan."}&quot;
                                </p>
                            </div>
                        )}

                        {/* SECTION: STATUS & DEADLINE */}
                        <div className="grid grid-cols-3 gap-4">
                            <InfoBox
                                icon={Briefcase}
                                label="Urgensi"
                                content={
                                    <Badge variant="outline" className="border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px]">
                                        {agenda.urgency}
                                    </Badge>
                                }
                            />
                            <InfoBox
                                icon={Calendar}
                                label="Deadline Rapat"
                                content={
                                    <p className="text-sm font-black text-[#125d72]">
                                        {format(new Date(agenda.deadline), "dd MMMM yyyy", { locale: id })}
                                    </p>
                                }
                            />
                            <InfoBox
                                label="Prioritas"
                                content={
                                    <div className="h-10 flex items-center px-4 border-2 rounded-md bg-[#f8fafc] font-black italic">
                                        <span className={agenda.priority === 'High' ? 'text-red-600' : agenda.priority === 'Medium' ? 'text-orange-500' : 'text-green-600'}>
                                            {agenda.priority ?? 'Low'}
                                        </span>
                                    </div>
                                }
                            />
                        </div>

                        {/* SECTION: PEMRAKARSA */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Informasi Pemrakarsa</h4>
                            <div className="grid gap-3">
                                <DetailItem label="Direktur" value={agenda.director} icon={User} />
                                <DetailItem label="Unit Pemrakarsa" value={agenda.initiator} icon={Briefcase} />
                                <DetailItem label="Unit Support" value={agenda.support || "-"} icon={Briefcase} />
                            </div>
                        </div>

                        {/* SECTION: NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Narahubung (PIC)</h4>
                            <div className="grid gap-3 p-4 rounded-xl border-2 border-dashed border-slate-100">
                                <DetailItem label="Nama PIC" value={agenda.contactPerson} icon={User} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={Briefcase} />
                                <DetailItem label="No. WhatsApp" value={agenda.phone} icon={Phone} />
                            </div>
                        </div>

                        {/* SECTION: LAMPIRAN */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#14a2ba] uppercase tracking-[0.2em] border-b pb-2">Lampiran Dokumen</h4>
                            <div className="grid gap-2">
                                <FileLink label="Kajian Hukum" path={agenda.legalReview} onOpen={handleSecureView} />
                                <FileLink label="Kajian Risiko" path={agenda.riskReview} onOpen={handleSecureView} />
                                <FileLink label="Kajian Kepatuhan" path={agenda.complianceReview} onOpen={handleSecureView} />
                                <FileLink label="Nota Analisa" path={agenda.recommendationNote} onOpen={handleSecureView} />
                                <FileLink label="Materi Presentasi" path={agenda.presentationMaterial} onOpen={handleSecureView} />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

// Sub-komponen helper
function InfoBox({ label, icon: Icon, content }: { label: string, icon?: LucideIcon, content: React.ReactNode }) {
    return (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {Icon && <Icon className="h-3 w-3 text-[#14a2ba]" />} {label}
            </p>
            {content}
        </div>
    )
}

function DetailItem({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon: LucideIcon }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-1 text-[#14a2ba] opacity-70">
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                <p className="text-sm font-semibold text-[#125d72] leading-tight">{value ?? "-"}</p>
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
            className="w-full flex items-center justify-between p-3 rounded-lg border bg-slate-50 hover:bg-[#e7f6f9] hover:border-[#14a2ba] transition-all group"
        >
            <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-slate-400 group-hover:text-[#14a2ba]" />
                <span className="text-xs font-bold text-[#125d72]">{label}</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-[#14a2ba]" />
        </button>
    )
}