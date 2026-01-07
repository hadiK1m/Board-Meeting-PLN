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
    LucideIcon
} from "lucide-react"
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"

// ✅ Strong Interface untuk menghindari 'any'
interface AgendaDetail {
    id?: string
    title: string
    urgency: string
    priority?: string | null
    deadline: string | Date
    director?: string | null
    initiator?: string | null
    support?: string | null
    contact_person?: string | null
    contactPerson?: string | null
    position?: string | null
    phone?: string | null
    legal_review?: string | null
    legalReview?: string | null
    risk_review?: string | null
    riskReview?: string | null
    compliance_review?: string | null
    complianceReview?: string | null
    regulation_review?: string | null
    regulationReview?: string | null
    recommendation_note?: string | null
    recommendationNote?: string | null
    proposal_note?: string | null
    proposalNote?: string | null
    presentation_material?: string | null
    presentationMaterial?: string | null
    supporting_documents?: string | null
    supportingDocuments?: string | null
    status?: string | null
}

interface DetailAgendaSheetProps {
    agenda: AgendaDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailAgendaSheet({ agenda, open, onOpenChange }: DetailAgendaSheetProps) {
    // ✅ Logic Parsing Dokument Pendukung yang aman
    const extraDocs: string[] = React.useMemo(() => {
        const raw = agenda?.supporting_documents || agenda?.supportingDocuments
        if (!raw || raw === "[]") return []
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
            return Array.isArray(parsed) ? parsed : []
        } catch {
            // ✅ Fix: Menghapus 'e' yang tidak terpakai
            return []
        }
    }, [agenda])

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

    // Mapping fields konsisten
    const docs = {
        legal: agenda.legal_review || agenda.legalReview,
        risk: agenda.risk_review || agenda.riskReview,
        compliance: agenda.compliance_review || agenda.complianceReview,
        regulation: agenda.regulation_review || agenda.regulationReview,
        recommendation: agenda.recommendation_note || agenda.recommendationNote,
        proposal: agenda.proposal_note || agenda.proposalNote,
        presentation: agenda.presentation_material || agenda.presentationMaterial,
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-150 p-0 flex flex-col h-dvh border-none shadow-2xl overflow-hidden"
            >
                <SheetClose className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-all hover:bg-white/20 focus:outline-none active:scale-95">
                    <X className="h-5 w-5" />
                </SheetClose>

                <SheetHeader className="p-6 md:p-8 bg-[#125d72] text-white shrink-0 z-10 shadow-md relative">
                    <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-[#efe62f] text-[#125d72] font-bold uppercase text-[10px] px-3 py-1 border-none shadow-sm">
                            {agenda.status}
                        </Badge>
                    </div>
                    <SheetTitle className="text-lg md:text-2xl font-black text-white leading-tight uppercase tracking-tight pr-10">
                        {agenda.title}
                    </SheetTitle>
                    <SheetDescription className="text-[#e7f6f9] text-[11px] md:text-xs italic opacity-80 mt-1">
                        Detail informasi usulan agenda rapat direksi
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 h-full bg-slate-50 border-t">
                    <div className="p-6 md:p-8 space-y-6 md:space-y-8 pb-32">
                        {/* SECTION 1: INFO CARDS */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <InfoCard label="Urgensi" icon={Briefcase} content={<Badge variant="outline" className="border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px]">{agenda.urgency}</Badge>} />
                            <InfoCard label="Deadline" icon={Calendar} content={<p className="text-xs md:text-sm font-black text-[#125d72]">{agenda.deadline ? format(new Date(agenda.deadline), "dd MMM yyyy", { locale: id }) : "-"}</p>} />
                            <InfoCard label="Prioritas" icon={Info} content={<div className={cn("text-[10px] font-black italic px-2 py-0.5 rounded border w-fit", agenda.priority === 'High' ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200')}>{agenda.priority ?? 'Low'}</div>} />
                        </div>

                        {/* SECTION 2: PEMRAKARSA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Informasi Pemrakarsa</h4>
                            <div className="grid gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <DetailItem label="Direktur" value={agenda.director} icon={<User className="h-4 w-4" />} />
                                <DetailItem label="Unit Pemrakarsa" value={agenda.initiator} icon={<Briefcase className="h-4 w-4" />} />
                                <DetailItem label="Unit Support" value={agenda.support || "-"} icon={<Briefcase className="h-4 w-4" />} />
                            </div>
                        </div>

                        {/* SECTION 3: NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Narahubung  </h4>
                            <div className="grid gap-4 p-5 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <DetailItem label="Nama  " value={agenda.contact_person || agenda.contactPerson} icon={<User className="h-4 w-4" />} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={<Briefcase className="h-4 w-4" />} />
                                <DetailItem label="No. WhatsApp" value={agenda.phone} icon={<Phone className="h-4 w-4" />} />
                            </div>
                        </div>

                        {/* SECTION 4: LAMPIRAN */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#14a2ba] uppercase tracking-[0.2em] border-b pb-2">Lampiran Dokumen</h4>
                            <div className="grid gap-2">
                                <FileLink label="Kajian Hukum" path={docs.legal} onOpen={handleSecureView} />
                                <FileLink label="Kajian Risiko" path={docs.risk} onOpen={handleSecureView} />
                                <FileLink label="Kajian Kepatuhan" path={docs.compliance} onOpen={handleSecureView} />
                                <FileLink label="Kajian Regulasi" path={docs.regulation} onOpen={handleSecureView} />
                                <FileLink label="Nota Analisa" path={docs.recommendation} onOpen={handleSecureView} />
                                <FileLink label="Proposal Note" path={docs.proposal} onOpen={handleSecureView} />
                                <FileLink label="Materi Presentasi" path={docs.presentation} onOpen={handleSecureView} />

                                {extraDocs.map((docPath, index) => (
                                    <FileLink
                                        key={`extra-${index}`}
                                        label={`Dokumen Pendukung ${index + 1}`}
                                        path={docPath}
                                        onOpen={handleSecureView}
                                        isExtra
                                    />
                                ))}

                                {!docs.legal && !docs.risk && !docs.compliance && !docs.regulation && !docs.recommendation && !docs.proposal && !docs.presentation && extraDocs.length === 0 && (
                                    <p className="text-[10px] text-slate-400 italic py-4 text-center bg-white rounded-xl border-2 border-dashed">
                                        Tidak ada lampiran dokumen yang diunggah.
                                    </p>
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
        <div className="p-3 md:p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-2">
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Icon className="h-3 w-3 text-[#14a2ba]" /> {label}
            </p>
            {content}
        </div>
    )
}

function DetailItem({ label, value, icon }: { label: string, value: string | null | undefined, icon: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                {/* ✅ Perbaikan 3: wrap-break-word sesuai linter */}
                <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight wrap-break-word">{value || "-"}</p>
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
                {isExtra ? <Paperclip className="h-4 w-4 text-slate-400 shrink-0" /> : <FileText className="h-4 w-4 text-slate-400 shrink-0" />}
                <span className={cn("text-[11px] md:text-xs font-bold truncate", isExtra ? "text-slate-600" : "text-[#125d72]")}>{label}</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
        </button>
    )
}