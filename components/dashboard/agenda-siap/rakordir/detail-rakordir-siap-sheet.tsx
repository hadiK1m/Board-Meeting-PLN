"use client"

import * as React from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Building2,
    Info,
    FileText,
    Presentation,
    User,
    Phone,
    Briefcase,
    Calendar,
    AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"

// ✅ Tipe Data yang ketat sesuai dengan Interface Rakordir
interface AgendaDetail {
    id: string
    title: string
    urgency: string
    deadline: Date
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
}

interface DetailRakordirSiapSheetProps {
    agenda: AgendaDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailRakordirSiapSheet({ agenda, open, onOpenChange }: DetailRakordirSiapSheetProps) {
    if (!agenda) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-125 p-0 border-none shadow-2xl">
                <SheetHeader className="p-6 bg-[#125d72] text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-[#14a2ba] hover:bg-[#14a2ba] text-white border-none text-[10px] font-bold uppercase">
                            RAKORDIR
                        </Badge>
                        <Badge variant="outline" className="text-white border-white/30 text-[10px] uppercase">
                            {agenda.status.replace(/_/g, ' ')}
                        </Badge>
                    </div>
                    <SheetTitle className="text-white font-black text-xl leading-tight uppercase tracking-tight">
                        Detail Agenda Rakordir
                    </SheetTitle>
                    <SheetDescription className="text-white/70 text-xs italic font-medium">
                        ID Agenda: {agenda.id}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-140px)] p-6">
                    <div className="space-y-8">
                        {/* Judul & Urgency */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-[#125d72] text-sm uppercase leading-relaxed">
                                {agenda.title}
                            </h3>
                            <div className="flex flex-wrap gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs font-bold text-slate-600 uppercase">Urgensi: {agenda.urgency}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-[#14a2ba]" />
                                    <span className="text-xs font-bold text-slate-600 uppercase">
                                        Deadline: {format(new Date(agenda.deadline), "dd MMMM yyyy", { locale: localeID })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* Status Batal jika ada */}
                        {agenda.status === "DIBATALKAN" && agenda.cancellationReason && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                                    <Info className="h-4 w-4" /> Alasan Pembatalan
                                </div>
                                <p className="text-xs text-red-700 italic leading-snug">
                                    &quot;{agenda.cancellationReason}&quot;
                                </p>
                            </div>
                        )}

                        {/* Dokumen Utama Rakordir */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[#125d72] font-bold text-xs uppercase tracking-wider">
                                <FileText className="h-4 w-4" /> Dokumen Utama
                            </div>
                            <div className="grid gap-3">
                                <div className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                    agenda.proposalNote ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100 opacity-60"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <FileText className={cn("h-5 w-5", agenda.proposalNote ? "text-emerald-600" : "text-slate-400")} />
                                        <span className="text-xs font-bold text-slate-700">Nota Proposal</span>
                                    </div>
                                    <Badge className={cn("text-[9px] uppercase", agenda.proposalNote ? "bg-emerald-600" : "bg-slate-400")}>
                                        {agenda.proposalNote ? "Tersedia" : "Kosong"}
                                    </Badge>
                                </div>

                                <div className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                    agenda.presentationMaterial ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-100 opacity-60"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <Presentation className={cn("h-5 w-5", agenda.presentationMaterial ? "text-blue-600" : "text-slate-400")} />
                                        <span className="text-xs font-bold text-slate-700">Materi Presentasi</span>
                                    </div>
                                    <Badge className={cn("text-[9px] uppercase", agenda.presentationMaterial ? "bg-blue-600" : "bg-slate-400")}>
                                        {agenda.presentationMaterial ? "Tersedia" : "Kosong"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Narahubung / PIC */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[#125d72] font-bold text-xs uppercase tracking-wider">
                                <User className="h-4 w-4" /> Narahubung (PIC)
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center text-[#14a2ba] font-bold">
                                        {agenda.contactPerson.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 uppercase">{agenda.contactPerson}</p>
                                        <p className="text-[10px] text-slate-500 flex items-center gap-1 uppercase">
                                            <Briefcase className="h-3 w-3" /> {agenda.position || "N/A"}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-2 flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                        <Phone className="h-3.5 w-3.5 text-[#14a2ba]" /> {agenda.phone || "-"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Struktur Pemrakarsa */}
                        <div className="space-y-4 pb-10">
                            <div className="flex items-center gap-2 text-[#125d72] font-bold text-xs uppercase tracking-wider">
                                <Building2 className="h-4 w-4" /> Struktur Pemrakarsa
                            </div>
                            <div className="grid gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Direktur Pemrakarsa</p>
                                    <p className="text-sm font-semibold text-slate-700 uppercase">{agenda.director || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Divisi Pemrakarsa</p>
                                    <p className="text-sm font-semibold text-slate-700 uppercase">{agenda.initiator || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Divisi Support</p>
                                    <p className="text-sm font-semibold text-slate-700 uppercase">{agenda.support || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}