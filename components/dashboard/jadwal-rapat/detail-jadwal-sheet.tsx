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
    Clock,
    MapPin,
    Video,
    User,
    Briefcase,
    FileText,
    ExternalLink,
    Phone,
    Info,
    LucideIcon
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { AgendaReady } from "./jadwal-rapat-client"

interface DetailJadwalSheetProps {
    agenda: AgendaReady | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailJadwalSheet({ agenda, open, onOpenChange }: DetailJadwalSheetProps) {
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
            <SheetContent className="sm:max-w-150 p-0 flex flex-col h-full border-none shadow-2xl overflow-hidden">

                {/* Header tetap di atas */}
                <SheetHeader className="p-8 bg-[#125d72] text-white shrink-0 z-10 shadow-md">
                    <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-[#efe62f] text-[#125d72] font-black uppercase text-[10px] px-4 py-1 border-none shadow-sm">
                            {agenda.status.replace(/_/g, ' ')}
                        </Badge>
                    </div>
                    <SheetTitle className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                        {agenda.title}
                    </SheetTitle>
                </SheetHeader>

                {/* ScrollArea dengan fleksibilitas tinggi */}
                <ScrollArea className="flex-1 h-full bg-slate-50 border-t">
                    {/* Menggunakan pb-32 untuk padding bawah yang sangat lega */}
                    <div className="p-8 space-y-8 pb-32">

                        {/* SECTION 1: JADWAL PELAKSANAAN */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Jadwal Pelaksanaan</h4>
                            <div className="grid grid-cols-1 gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <DetailItem
                                    label="Tanggal Rapat"
                                    value={agenda.executionDate ? format(new Date(agenda.executionDate), "EEEE, dd MMMM yyyy", { locale: id }) : "-"}
                                    icon={Calendar}
                                />
                                <DetailItem
                                    label="Waktu / Jam"
                                    value={`${agenda.startTime} - ${agenda.endTime}`}
                                    icon={Clock}
                                />
                                <DetailItem
                                    label="Metode Rapat"
                                    value={agenda.meetingMethod ?? "-"}
                                    icon={Info}
                                />
                                <DetailItem
                                    label="Lokasi / Link"
                                    value={agenda.meetingLocation || agenda.meetingLink || "-"}
                                    icon={agenda.meetingMethod === "ONLINE" ? Video : MapPin}
                                />
                            </div>
                        </div>

                        {/* SECTION 2: URGENSI */}
                        <div className="grid grid-cols-1">
                            <InfoBox
                                icon={Briefcase}
                                label="Urgensi Agenda"
                                content={
                                    <Badge variant="outline" className="border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px]">
                                        {agenda.urgency}
                                    </Badge>
                                }
                            />
                        </div>

                        {/* SECTION 3: PEMRAKARSA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Informasi Pemrakarsa</h4>
                            <div className="grid gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <DetailItem label="Direktur Pemrakarsa" value={agenda.director} icon={User} />
                                <DetailItem label="Pemrakarsa" value={agenda.initiator} icon={Briefcase} />
                                <DetailItem label="Support" value={agenda.support || "-"} icon={Briefcase} />
                            </div>
                        </div>

                        {/* SECTION 4: NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Narahubung  </h4>
                            <div className="grid gap-4 p-6 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <DetailItem label="Nama  " value={agenda.contactPerson} icon={User} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={Briefcase} />
                                <DetailItem label="No. WhatsApp" value={agenda.phone} icon={Phone} />
                            </div>
                        </div>

                        {/* SECTION 5: LAMPIRAN DOKUMEN */}
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

                        {/* ✅ EXTRA SPACER: Memastikan user bisa scroll jauh melewati konten terakhir */}
                        <div className="h-20 w-full invisible" aria-hidden="true" />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

// Helper components tetap sama (InfoBox, DetailItem, FileLink)...
function InfoBox({ label, icon: Icon, content }: { label: string, icon?: LucideIcon, content: React.ReactNode }) {
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
            className="w-full flex items-center justify-between p-4 rounded-xl border bg-white hover:bg-[#e7f6f9] hover:border-[#14a2ba] transition-all group"
        >
            <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-slate-400 group-hover:text-[#14a2ba]" />
                <span className="text-xs font-bold text-[#125d72]">{label}</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-[#14a2ba]" />
        </button>
    )
}