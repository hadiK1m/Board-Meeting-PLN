"use client"

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
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
} from "lucide-react"
// sonner toast removed from this file because secure view flow does not use toasts
import { getSignedFileUrl } from "@/server/actions/agenda-actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
// NOTE: Do not construct public URLs client-side using NEXT_PUBLIC_SUPABASE_URL.
// We'll request a signed URL from the server action `getSignedFileUrl` when the user
// clicks a file link so the server can validate authentication and create a
// time-limited signed URL.

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
}

interface DetailAgendaSheetProps {
    agenda: AgendaDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DetailAgendaSheet({ agenda, open, onOpenChange }: DetailAgendaSheetProps) {
    if (!agenda) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-150 p-0 flex flex-col gap-0 border-none shadow-2xl">
                <SheetHeader className="p-6 bg-[#125d72] text-white">
                    <div className="flex justify-between items-start pt-4">
                        <Badge className="bg-[#efe62f] text-[#125d72] hover:bg-[#efe62f] font-bold uppercase text-[10px]">
                            {agenda.status}
                        </Badge>
                    </div>
                    <SheetTitle className="text-white text-xl font-bold leading-tight mt-2 uppercase">
                        {agenda.title}
                    </SheetTitle>
                    <SheetDescription className="text-[#e7f6f9] italic opacity-80">
                        Detail informasi usulan agenda rapat direksi
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6 bg-white">
                    <div className="space-y-8 pb-10">
                        {/* SECTION: STATUS & DEADLINE */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase className="h-3 w-3 text-[#14a2ba]" /> Urgensi
                                </p>
                                <Badge variant="outline" className="border-[#14a2ba] text-[#14a2ba] font-bold uppercase text-[10px]">
                                    {agenda.urgency}
                                </Badge>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-[#14a2ba]" /> Deadline Rapat
                                </p>
                                <p className="text-sm font-black text-[#125d72]">
                                    {format(new Date(agenda.deadline), "dd MMMM yyyy", { locale: id })}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Prioritas
                                </p>
                                <div className="h-10 flex items-center px-4 border-2 rounded-md bg-[#f8fafc] font-black italic">
                                    <span className={agenda.priority === 'High' ? 'text-red-600' : agenda.priority === 'Medium' ? 'text-orange-500' : 'text-green-600'}>
                                        {agenda.priority ?? 'Low'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: PEMRAKARSA */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Informasi Pemrakarsa</h4>
                            <div className="grid gap-3">
                                <DetailItem label="Direktur" value={agenda.director} icon={<User className="h-4 w-4" />} />
                                <DetailItem label="Unit Pemrakarsa" value={agenda.initiator} icon={<Briefcase className="h-4 w-4" />} />
                                <DetailItem label="Unit Support" value={agenda.support || "-"} icon={<Briefcase className="h-4 w-4" />} />
                            </div>
                        </div>

                        {/* SECTION: NARAHUBUNG */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#125d72] uppercase tracking-[0.2em] border-b pb-2">Narahubung (PIC)</h4>
                            <div className="grid gap-3 p-4 rounded-xl border-2 border-dashed border-slate-100">
                                <DetailItem label="Nama PIC" value={agenda.contactPerson} icon={<User className="h-4 w-4" />} />
                                <DetailItem label="Jabatan" value={agenda.position} icon={<Briefcase className="h-4 w-4" />} />
                                <DetailItem label="No. WhatsApp" value={agenda.phone} icon={<Phone className="h-4 w-4" />} />
                            </div>
                        </div>

                        {/* SECTION: LAMPIRAN */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#14a2ba] uppercase tracking-[0.2em] border-b pb-2">Lampiran Dokumen</h4>
                            <div className="grid gap-2">
                                <FileLink label="Kajian Hukum" path={agenda.legalReview} />
                                <FileLink label="Kajian Risiko" path={agenda.riskReview} />
                                <FileLink label="Kajian Kepatuhan" path={agenda.complianceReview} />
                                <FileLink label="Nota Analisa" path={agenda.recommendationNote} />
                                <FileLink label="Materi Presentasi" path={agenda.presentationMaterial} />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

// Sub-komponen helper
function DetailItem({ label, value, icon }: { label: string, value: string | null | undefined, icon: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-1 text-[#14a2ba] opacity-70">{icon}</div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                <p className="text-sm font-semibold text-[#125d72] leading-tight">{value ?? "-"}</p>
            </div>
        </div>
    )
}

function FileLink({ label, path }: { label: string, path: string | null | undefined }) {
    if (!path) return null
    const handleSecureView = async (path: string) => {
        try {
            // 1. Minta signed URL (server sekarang membuat URL bernilai 15 detik)
            const signedUrl = await getSignedFileUrl(path)
            if (!signedUrl) return

            // 2. Download file ke memori browser (Blob)
            const response = await fetch(signedUrl)
            if (!response.ok) {
                console.error('Gagal mengunduh file, status:', response.status)
                return
            }
            const blob = await response.blob()

            // 3. Buat URL lokal yang hanya ada di tab ini
            const localBlobUrl = URL.createObjectURL(blob)

            // 4. Buka tab baru dengan URL lokal tersebut
            window.open(localBlobUrl, '_blank')

            // 5. Hapus jejak link asli di memori setelah 1 menit
            setTimeout(() => URL.revokeObjectURL(localBlobUrl), 60_000)
        } catch (err) {
            console.error('Error secure view', err)
        }
    }

    return (
        <button
            type="button"
            onClick={() => handleSecureView(path)}
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