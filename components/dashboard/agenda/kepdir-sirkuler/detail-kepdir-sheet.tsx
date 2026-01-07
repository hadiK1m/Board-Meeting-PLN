"use client"

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
    FileText,
    User,
    Building2,
    Info,
    Paperclip,
    FileSignature,
    ShieldCheck,
    Phone,
    Briefcase,
    type LucideIcon // Import tipe LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

// 1. Definisikan Tipe Data Agenda secara spesifik
interface AgendaDetail {
    id: string
    title: string
    status: string
    director: string | null
    initiator: string | null
    contactPerson: string
    position: string
    phone: string
    kepdirSirkulerDoc?: string | null
    grcDoc?: string | null
    supportingDocuments?: string[] | string | null // Bisa array string atau JSON string
}

interface DetailKepdirSheetProps {
    agenda: AgendaDetail | null // Gunakan interface tadi
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailKepdirSheet({ agenda, open, onOpenChange }: DetailKepdirSheetProps) {
    if (!agenda) return null

    // 2. Gunakan tipe 'LucideIcon' untuk parameter Icon
    const renderFileStatus = (label: string, path: string | null | undefined, Icon: LucideIcon, colorClass: string) => (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-md", colorClass)}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
            </div>
            {path ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Tersedia</Badge>
            ) : (
                <Badge className="bg-red-100 text-red-700 border-red-200">Belum Ada</Badge>
            )}
        </div>
    );

    // Helper untuk menghitung dokumen pendukung dengan aman
    const getSupportDocsCount = () => {
        if (!agenda.supportingDocuments) return 0
        if (Array.isArray(agenda.supportingDocuments)) return agenda.supportingDocuments.length
        // Jika formatnya masih string JSON (dari database text), coba parse (opsional)
        try {
            const parsed = JSON.parse(agenda.supportingDocuments)
            return Array.isArray(parsed) ? parsed.length : 0
        } catch {
            return 0
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {/* Menggunakan max-w-lg (32rem/512px) sebagai alternatif standar tailwind mendekati 500px */}
            <SheetContent className="sm:max-w-lg p-0 border-none shadow-2xl">
                <SheetHeader className="p-6 bg-[#125d72] text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-500 text-white uppercase font-black text-[10px]">
                            Kepdir Sirkuler
                        </Badge>
                        <Badge className="bg-[#efe62f] text-[#125d72] uppercase font-black text-[10px]">
                            {agenda.status}
                        </Badge>
                    </div>
                    <SheetTitle className="text-white text-xl leading-tight font-bold">
                        Detail Agenda Sirkuler
                    </SheetTitle>
                    <SheetDescription className="text-blue-100 italic text-xs">
                        ID: {agenda.id}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-140px)]">
                    <div className="p-6 space-y-8">
                        {/* Judul Agenda */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[#14a2ba] font-bold text-xs uppercase tracking-wider">
                                <Info className="h-4 w-4" /> Judul Agenda
                            </div>
                            <h3 className="font-bold text-[#125d72] text-lg leading-snug">
                                {agenda.title}
                            </h3>
                        </div>

                        <Separator />

                        {/* Struktur Pemrakarsa */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[#14a2ba] font-bold text-xs uppercase tracking-wider">
                                <Building2 className="h-4 w-4" /> Struktur Pemrakarsa
                            </div>
                            <div className="grid gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Direktur Pemrakarsa</p>
                                    <p className="text-sm font-bold text-slate-700">{agenda.director || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Divisi Pemrakarsa</p>
                                    <p className="text-sm font-bold text-slate-700">{agenda.initiator || "-"}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Narahubung */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[#14a2ba] font-bold text-xs uppercase tracking-wider">
                                <User className="h-4 w-4" /> Narahubung (PIC)
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50">
                                <div className="h-12 w-12 rounded-full bg-[#125d72] flex items-center justify-center text-white font-black text-lg">
                                    {agenda.contactPerson?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-800 leading-none">{agenda.contactPerson}</p>
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                        <Briefcase className="h-3 w-3" /> {agenda.position}
                                    </div>
                                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                        <Phone className="h-3 w-3" /> {agenda.phone}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Kelengkapan Dokumen */}
                        <div className="space-y-4 pb-10">
                            <div className="flex items-center gap-2 text-[#14a2ba] font-bold text-xs uppercase tracking-wider">
                                <Paperclip className="h-4 w-4" /> Kelengkapan Dokumen
                            </div>
                            <div className="grid gap-3">
                                {renderFileStatus(
                                    "Dokumen Kepdir Sirkuler",
                                    agenda.kepdirSirkulerDoc,
                                    FileSignature,
                                    "bg-blue-100 text-blue-600"
                                )}
                                {renderFileStatus(
                                    "Dokumen GRC",
                                    agenda.grcDoc,
                                    ShieldCheck,
                                    "bg-emerald-100 text-emerald-600"
                                )}
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-slate-200 text-slate-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">Dokumen Pendukung</span>
                                    </div>
                                    <Badge variant="outline" className="font-bold">
                                        {getSupportDocsCount()} File
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}