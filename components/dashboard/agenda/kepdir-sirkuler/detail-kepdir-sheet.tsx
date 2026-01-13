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
    User,
    Phone,
    Briefcase,
    FileText,
    ExternalLink,
    X,
    Paperclip,
    LucideIcon,
    ShieldCheck,
    Building2
} from "lucide-react"
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { cn } from "@/lib/utils"

// ✅ FIX 1: Interface yang sinkron dengan database (Drizzle) dan Client
export interface AgendaDetail {
    id: string
    title: string
    director?: string | null
    initiator?: string | null
    contactPerson?: string | null
    position?: string | null
    phone?: string | null
    kepdirSirkulerDoc?: string | null
    grcDoc?: string | null
    // ✅ Diubah dari any[] ke string | string[] untuk menangani JSONB dari database
    supportingDocuments?: string | string[] | null
    notRequiredFiles?: string | string[] | null
    status?: string | null
    priority?: string | null
    urgency?: string | null
    deadline?: Date | string | null
    createdAt?: Date | string | null
    updatedAt?: Date | string | null
}

interface DetailKepdirSheetProps {
    data: AgendaDetail | null
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DetailKepdirSheet({ data: agenda, isOpen: open, onOpenChange }: DetailKepdirSheetProps) {
    // ✅ FIX 2: Logic Parsing Tanpa 'any'
    const extraDocs: string[] = React.useMemo(() => {
        const raw = agenda?.supportingDocuments
        if (!raw || raw === "[]") return []

        try {
            if (Array.isArray(raw)) return raw.map(String)
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
            return Array.isArray(parsed) ? (parsed as unknown[]).map(String) : []
        } catch {
            return []
        }
    }, [agenda])

    if (!agenda) return null

    const handleSecureView = async (path: string) => {
        if (!path || path === "null") return
        try {
            const result = await getSignedFileUrl(path) // Kita ganti nama variabel agar lebih jelas

            // Cek apakah sukses dan URL-nya ada
            if (!result.success || !result.url) {
                console.error(result.error)
                return
            }

            const response = await fetch(result.url) // Gunakan result.url yang berupa string
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
                <SheetClose className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-all hover:bg-white/20 focus:outline-none active:scale-95">
                    <X className="h-5 w-5" />
                </SheetClose>

                <SheetHeader className="p-6 md:p-8 bg-[#125d72] text-white shrink-0 z-10 shadow-md relative">
                    <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-[#14a2ba] text-white font-bold uppercase text-[10px] px-3 py-1 border-none shadow-sm tracking-widest">
                            {agenda.status || 'Draft'}
                        </Badge>
                    </div>
                    <SheetTitle className="text-lg md:text-2xl font-black text-white leading-tight uppercase tracking-tight pr-10 italic">
                        {agenda.title}
                    </SheetTitle>
                    <SheetDescription className="text-[#e7f6f9] text-[11px] md:text-xs italic opacity-80 mt-1">
                        Sistem Board Meeting PLN - Detail Usulan Kepdir Sirkuler
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0 bg-slate-50 border-t">
                    <div className="p-6 md:p-8 space-y-6 md:space-y-8 pb-32">

                        {/* SECTION 1: UNIT & DIREKTUR */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-l-4 border-[#efe62f] pl-3">Unit Pemrakarsa</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <InfoCard
                                    label="Direktur Pemrakarsa"
                                    icon={User}
                                    content={<p className="text-xs md:text-sm font-black text-[#125d72] uppercase truncate">{agenda.director || "-"}</p>}
                                />
                                <InfoCard
                                    label="Unit Kerja"
                                    icon={Building2}
                                    content={<p className="text-xs md:text-sm font-black text-[#125d72] uppercase truncate">{agenda.initiator || "-"}</p>}
                                />
                            </div>
                        </div>

                        {/* SECTION 2: NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em] border-l-4 border-[#14a2ba] pl-3">Data Narahubung</h4>
                            <div className="grid gap-4 p-5 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
                                <DetailItem label="Nama Narahubung" value={agenda.contactPerson} icon={<User className="h-4 w-4" />} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={<Briefcase className="h-4 w-4" />} />
                                <DetailItem label="No. WhatsApp" value={agenda.phone} icon={<Phone className="h-4 w-4" />} />
                            </div>
                        </div>

                        {/* SECTION 3: DOKUMEN UTAMA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[#14a2ba] uppercase tracking-[0.2em] border-b pb-2">Dokumen Utama Sirkuler</h4>
                            <div className="grid gap-3">
                                <FileLink
                                    label="DOKUMEN KEPDIR SIRKULER"
                                    path={agenda.kepdirSirkulerDoc}
                                    onOpen={handleSecureView}
                                    primary
                                />
                                <FileLink
                                    label="DOKUMEN GRC"
                                    path={agenda.grcDoc}
                                    onOpen={handleSecureView}
                                    primary
                                />
                            </div>
                        </div>

                        {/* SECTION 4: LAMPIRAN PENDUKUNG */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Lampiran Pendukung</h4>
                            <div className="grid gap-2">
                                {extraDocs.length > 0 ? (
                                    extraDocs.map((docPath, index) => (
                                        <FileLink
                                            key={`extra-${index}`}
                                            label={`Dokumen Pendukung ${index + 1}`}
                                            path={docPath}
                                            onOpen={handleSecureView}
                                            isExtra
                                        />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                                        <Paperclip className="h-8 w-8 text-slate-200 mb-2" />
                                        <p className="text-[10px] text-slate-400 italic">
                                            Tidak ada dokumen pendukung lainnya.
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
        <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between items-start gap-2 hover:border-[#14a2ba]/30 transition-colors">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
            <div className="mt-1 text-[#14a2ba] opacity-70 shrink-0 group-hover:opacity-100 transition-opacity">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                <p className="text-xs md:text-sm font-semibold text-[#125d72] leading-tight wrap-break-word uppercase">{value || "-"}</p>
            </div>
        </div>
    )
}

function FileLink({ label, path, onOpen, isExtra, primary }: { label: string, path: string | null | undefined, onOpen: (path: string) => Promise<void>, isExtra?: boolean, primary?: boolean }) {
    if (!path || path === "null" || path === "" || path === "[]") return null

    return (
        <button
            type="button"
            onClick={() => onOpen(path)}
            className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all group shadow-sm active:scale-[0.98]",
                primary ? "bg-white border-[#14a2ba]/30 hover:bg-[#e7f6f9] hover:border-[#14a2ba]" :
                    isExtra ? "bg-slate-50 border-slate-200 hover:bg-slate-100" : "bg-white"
            )}
        >
            <div className="flex items-center gap-3 truncate">
                {primary ? (
                    <ShieldCheck className="h-5 w-5 text-[#14a2ba] shrink-0" />
                ) : (
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                <span className={cn(
                    "text-[11px] md:text-xs font-bold truncate tracking-tight uppercase",
                    primary ? "text-[#125d72]" : "text-slate-600"
                )}>
                    {label}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-[#14a2ba] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">Buka Berkas</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#14a2ba] shrink-0" />
            </div>
        </button>
    )
}