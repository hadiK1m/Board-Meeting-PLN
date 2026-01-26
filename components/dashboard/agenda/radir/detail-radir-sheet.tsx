"use client"
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
} from "lucide-react"
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export interface AgendaDetail {
    id?: string
    title: string
    urgency: string | null
    priority?: string | null
    deadline: string | Date | null
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
    supporting_documents?: string | null | string[]
    supportingDocuments?: string | null | string[]
    status?: string | null
    notRequiredFiles?: string[] | string | null
    createdAt?: string | Date | null
    updatedAt?: string | Date | null
}

interface DetailAgendaSheetProps {
    agenda: AgendaDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailRadirSheet({ agenda, open, onOpenChange }: DetailAgendaSheetProps) {

    const extraDocs: string[] = (() => {
        const raw = agenda?.supporting_documents ?? agenda?.supportingDocuments
        if (!raw) return []
        if (Array.isArray(raw)) return raw
        if (typeof raw !== "string") return []
        try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    })()

    if (!agenda) return null

    const handleSecureView = async (path: string, label?: string) => {
        if (!path) return

        try {
            const result = await getSignedFileUrl(path)
            if (!result.success || !result.url) {
                throw new Error(result.error ?? "Gagal mendapatkan link aman")
            }

            window.open(result.url, "_blank", "noopener,noreferrer")
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Gagal membuka file"
            const fallbackLabel = label || "dokumen"
            toast.error(`Gagal membuka ${fallbackLabel}: ${message}`)
        }
    }

    const docs = {
        legal: agenda.legal_review ?? agenda.legalReview,
        risk: agenda.risk_review ?? agenda.riskReview,
        compliance: agenda.compliance_review ?? agenda.complianceReview,
        regulation: agenda.regulation_review ?? agenda.regulationReview,
        recommendation: agenda.recommendation_note ?? agenda.recommendationNote,
        proposal: agenda.proposal_note ?? agenda.proposalNote,
        presentation: agenda.presentation_material ?? agenda.presentationMaterial,
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

                <ScrollArea className="flex-1 min-h-0 bg-slate-50 border-t">
                    <div className="p-6 md:p-8 space-y-6 md:space-y-8 pb-32">
                        {/* SECTION INFO */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="col-span-1 md:col-span-2">
                                <div className="p-3 md:p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between items-start gap-2 h-full">
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Briefcase className="h-3 w-3 text-[#14a2ba]" /> Urgensi
                                    </p>
                                    <Badge
                                        variant="outline"
                                        className="border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px] whitespace-normal text-left leading-tight py-1.5 h-auto w-full block rounded-xl"
                                    >
                                        {agenda.urgency}
                                    </Badge>
                                </div>
                            </div>

                            <div className="p-3 md:p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between items-start gap-2 h-full">
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-[#14a2ba]" /> Deadline
                                </p>
                                <p className="text-xs md:text-sm font-black text-[#125d72]">
                                    {agenda.deadline
                                        ? format(new Date(agenda.deadline), "dd MMM yyyy", { locale: id })
                                        : "-"}
                                </p>
                            </div>

                            <div className="p-3 md:p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between items-start gap-2 h-full">
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="h-3 w-3 text-[#14a2ba]" /> Prioritas
                                </p>
                                <div
                                    className={cn(
                                        "text-[10px] font-black italic px-2 py-0.5 rounded border w-fit",
                                        agenda.priority === "High"
                                            ? "text-red-600 bg-red-50 border-red-200"
                                            : "text-green-600 bg-green-50 border-green-200"
                                    )}
                                >
                                    {agenda.priority ?? "Low"}
                                </div>
                            </div>
                        </div>

                        {/* SECTION PEMRAKARSA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">
                                Informasi Pemrakarsa
                            </h4>
                            <div className="grid gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            Direktur
                                        </p>
                                        <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight">
                                            {agenda.director || "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">
                                        <Briefcase className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            Unit Pemrakarsa
                                        </p>
                                        <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight">
                                            {agenda.initiator || "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">
                                        <Briefcase className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            Unit Support
                                        </p>
                                        <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight">
                                            {agenda.support || "-"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">
                                Narahubung
                            </h4>
                            <div className="grid gap-4 p-5 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            Nama
                                        </p>
                                        <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight">
                                            {agenda.contact_person ?? agenda.contactPerson ?? "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">
                                        <Briefcase className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            Jabatan
                                        </p>
                                        <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight">
                                            {agenda.position ?? "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            No. WhatsApp
                                        </p>
                                        <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight">
                                            {agenda.phone ?? "-"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION LAMPIRAN */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#14a2ba] uppercase tracking-[0.2em] border-b pb-2">
                                Lampiran Dokumen
                            </h4>
                            <div className="grid gap-2">
                                <FileLink
                                    label="Kajian Hukum"
                                    path={docs.legal}
                                    onOpen={handleSecureView}
                                />
                                <FileLink
                                    label="Kajian Risiko"
                                    path={docs.risk}
                                    onOpen={handleSecureView}
                                />
                                <FileLink
                                    label="Kajian Kepatuhan"
                                    path={docs.compliance}
                                    onOpen={handleSecureView}
                                />
                                <FileLink
                                    label="Kajian Regulasi"
                                    path={docs.regulation}
                                    onOpen={handleSecureView}
                                />
                                <FileLink
                                    label="Nota Analisa"
                                    path={docs.recommendation}
                                    onOpen={handleSecureView}
                                />
                                <FileLink
                                    label="Proposal Note"
                                    path={docs.proposal}
                                    onOpen={handleSecureView}
                                />
                                <FileLink
                                    label="Materi Presentasi"
                                    path={docs.presentation}
                                    onOpen={handleSecureView}
                                />

                                {extraDocs.map((docPath, index) => (
                                    <FileLink
                                        key={`extra-${index}`}
                                        label={`Dokumen Pendukung ${index + 1}`}
                                        path={docPath}
                                        onOpen={handleSecureView}
                                        isExtra
                                    />
                                ))}

                                {!docs.legal &&
                                    !docs.risk &&
                                    !docs.compliance &&
                                    !docs.regulation &&
                                    !docs.recommendation &&
                                    !docs.proposal &&
                                    !docs.presentation &&
                                    extraDocs.length === 0 && (
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

function FileLink({
    label,
    path,
    onOpen,
    isExtra
}: {
    label: string
    path: string | null | undefined
    onOpen: (path: string, label?: string) => Promise<void>
    isExtra?: boolean
}) {
    if (!path) return null

    return (
        <button
            type="button"
            onClick={() => onOpen(path, label)}
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