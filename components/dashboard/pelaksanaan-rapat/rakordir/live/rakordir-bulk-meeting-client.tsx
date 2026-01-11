"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Save,
    Loader2,
    ChevronRight,
    FileText,
    CheckCircle2,
    ArrowLeft,
    Clock,
    LayoutGrid
} from "lucide-react"

// UI Components
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { MultiValue } from "react-select"

// Import Sub-Sections
import { MeetingLogisticsSection } from "./sections/meeting-logistics-section"
import { AttendanceAndLeadershipSection, Option } from "./sections/attendance-and-leadership-section"
import { ExecutiveSummarySection } from "./sections/executive-summary-section"
import { ArahanDireksiSection } from "./sections/arahan-direksi-section"

// Logic & Types
import { updateRakordirLiveAction } from "@/server/actions/rakordir-actions"
import { Agenda } from "@/db/schema/agendas"

interface RakordirBulkMeetingClientProps {
    agendas: Agenda[]
    passedYear?: string
    passedNumber?: string
}

export default function RakordirBulkMeetingClient({
    agendas,
    passedYear,
    passedNumber
}: RakordirBulkMeetingClientProps) {
    const router = useRouter()

    // --- 1. STATE MANAGEMENT ---
    const [activeAgendaId, setActiveAgendaId] = useState<string>(agendas[0]?.id || "")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // A. Global State: Data yang sama untuk semua agenda dalam satu sesi (Nomor Rapat sama)
    const [globalDraft, setGlobalDraft] = useState({
        number: passedNumber || "",
        year: passedYear || new Date().getFullYear().toString(),
        date: agendas[0]?.executionDate || new Date().toISOString().split('T')[0],
        location: agendas[0]?.meetingLocation || "Gedung Kantor Pusat",
        startTime: agendas[0]?.startTime || "09:00",
        endTime: agendas[0]?.endTime || "Selesai",
        selectedPimpinan: [] as MultiValue<Option>,
        attendance: {} as Record<string, any>,
        guests: [] as any[],
    })

    // B. Specific State: Data yang berbeda-beda tiap agenda (Ringkasan & Arahan)
    const [specificDrafts, setSpecificDrafts] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {}
        agendas.forEach((a) => {
            initial[a.id] = {
                executiveSummary: a.executiveSummary || "",
                arahanDireksi: Array.isArray(a.arahanDireksi) ? a.arahanDireksi : [],
            }
        })
        return initial
    })

    // --- 2. DERIVED STATE ---
    const activeAgenda = useMemo(() =>
        agendas.find(a => a.id === activeAgendaId) || agendas[0],
        [agendas, activeAgendaId])

    const currentSpecific = specificDrafts[activeAgendaId]

    // --- 3. HELPERS ---
    const updateSpecific = (field: string, value: any) => {
        setSpecificDrafts(prev => ({
            ...prev,
            [activeAgendaId]: { ...prev[activeAgendaId], [field]: value }
        }))
    }

    const checkIsCompleted = (id: string) => {
        const data = specificDrafts[id]
        // Kriteria minimal: Ringkasan > 20 karakter dan ada minimal 1 arahan
        return data?.executiveSummary?.length > 20 && data?.arahanDireksi?.length > 0
    }

    // --- 4. SAVE HANDLER ---
    const handleSave = async () => {
        if (!passedNumber) return toast.error("Nomor rapat tidak terdeteksi")

        setIsSubmitting(true)
        try {
            // Gabungkan data Global dan Specific untuk tiap baris agenda di database
            const finalPayload = agendas.map(a => ({
                id: a.id,
                ...globalDraft,
                ...specificDrafts[a.id],
            }))

            const result = await updateRakordirLiveAction(finalPayload)

            if (result.success) {
                toast.success("Notulensi Rakordir berhasil disimpan secara massal")
                router.refresh()
            } else {
                toast.error(result.error || "Gagal menyimpan")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
            {/* SIDEBAR NAVIGASI AGENDA 
                Sesuai referensi: Fixed di kiri, scrollable sendiri.
            */}
            <aside className="hidden w-80 flex-col border-r bg-white md:flex overflow-hidden shadow-sm z-30">
                <div className="p-6 border-b shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/pelaksanaan-rapat/rakordir')}
                            className="h-8 w-8 rounded-full hover:bg-white shadow-sm"
                        >
                            <ArrowLeft className="h-4 w-4 text-slate-500" />
                        </Button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[#14a2ba] uppercase tracking-widest">Sesi Live</span>
                            <h1 className="text-xs font-black text-[#125d72] uppercase truncate">Rakordir #{passedNumber}</h1>
                        </div>
                    </div>
                    <Separator className="bg-slate-200" />
                </div>

                <ScrollArea className="flex-1 px-4 py-4">
                    <div className="space-y-2">
                        {agendas.map((item, index) => {
                            const isDone = checkIsCompleted(item.id)
                            const isActive = activeAgendaId === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveAgendaId(item.id)}
                                    className={cn(
                                        "w-full group flex items-start gap-3 p-4 rounded-2xl transition-all text-left border",
                                        isActive
                                            ? "bg-[#125d72] border-[#125d72] text-white shadow-xl shadow-[#125d72]/20 scale-[1.02]"
                                            : "bg-white border-transparent hover:border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-0.5 flex items-center justify-center min-w-6 h-6 rounded-lg text-[10px] font-black shrink-0",
                                        isActive ? "bg-white/20 text-white" : isDone ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                                    </div>
                                    <p className="text-[11px] font-black leading-tight uppercase line-clamp-2 italic">
                                        {item.title}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
                </ScrollArea>
            </aside>

            {/* MAIN CONTENT AREA 
                Sesuai referensi: Header sticky, Content ScrollArea.
            */}
            <main className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
                {/* STICKY HEADER */}
                <header className="shrink-0 bg-white/80 backdrop-blur-md border-b h-16 flex items-center justify-between px-8 z-20">
                    <div className="flex items-center gap-4 min-w-0">
                        <Badge className="bg-[#14a2ba]/10 text-[#14a2ba] border-none text-[9px] font-black px-3 py-1 shrink-0">
                            NOTULENSI AKTIF
                        </Badge>
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                            {activeAgenda.title}
                        </h2>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="bg-[#125d72] hover:bg-[#0d4a5b] text-white font-black text-[10px] px-8 rounded-xl shadow-xl h-10 tracking-widest transition-all active:scale-95 shrink-0"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        SIMPAN SEMUA AGENDA
                    </Button>
                </header>

                {/* AREA FORM (SCROLLABLE) */}
                <ScrollArea className="flex-1 min-h-0 bg-slate-50/30">
                    <div className="max-w-5xl mx-auto p-8 space-y-10 pb-40">

                        {/* SEKSI 1: LOGISTIK (GLOBAL) */}
                        <MeetingLogisticsSection
                            startTime={globalDraft.startTime}
                            setStartTime={(v) => setGlobalDraft(p => ({ ...p, startTime: v }))}
                            endTime={globalDraft.endTime}
                            setEndTime={(v) => setGlobalDraft(p => ({ ...p, endTime: v }))}
                            location={globalDraft.location}
                            setLocation={(v) => setGlobalDraft(p => ({ ...p, location: v }))}
                            executionDate={globalDraft.date}
                        />

                        {/* SEKSI 2: KEHADIRAN (GLOBAL) */}
                        <AttendanceAndLeadershipSection
                            attendance={globalDraft.attendance}
                            setAttendance={(v) => setGlobalDraft(p => ({ ...p, attendance: typeof v === 'function' ? v(p.attendance) : v }))}
                            guests={globalDraft.guests}
                            setGuests={(v) => setGlobalDraft(p => ({ ...p, guests: typeof v === 'function' ? v(p.guests) : v }))}
                            selectedPimpinan={globalDraft.selectedPimpinan}
                            setSelectedPimpinan={(v) => setGlobalDraft(p => ({ ...p, selectedPimpinan: v }))}
                        />

                        {/* SEKSI 3: RINGKASAN (SPECIFIC) */}
                        <ExecutiveSummarySection
                            value={currentSpecific.executiveSummary}
                            onChange={(v) => updateSpecific("executiveSummary", v)}
                            activeAgendaTitle={activeAgenda.title}
                        />

                        {/* SEKSI 4: ARAHAN (SPECIFIC) */}
                        <ArahanDireksiSection
                            arahan={currentSpecific.arahanDireksi}
                            setArahan={(v) => updateSpecific("arahanDireksi", typeof v === 'function' ? v(currentSpecific.arahanDireksi) : v)}
                        />

                        {/* NAVIGASI FOOTER */}
                        <div className="flex justify-center pt-12 border-t border-dashed border-slate-200">
                            {(() => {
                                const currentIndex = agendas.findIndex(a => a.id === activeAgendaId)
                                const nextAgenda = agendas[currentIndex + 1]
                                if (nextAgenda) {
                                    return (
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            onClick={() => setActiveAgendaId(nextAgenda.id)}
                                            className="w-full max-w-md h-14 bg-white border-2 border-[#125d72] text-[#125d72] text-[11px] font-black uppercase rounded-2xl shadow-xl gap-3 group hover:bg-[#125d72] hover:text-white transition-all"
                                        >
                                            BAHAS MATERI SELANJUTNYA
                                            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    )
                                }
                                return (
                                    <div className="p-10 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-[32px] flex flex-col items-center text-center w-full max-w-md">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                                        <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Sesi Selesai</p>
                                        <p className="text-[10px] text-emerald-600/70 font-bold mt-1 uppercase italic">Seluruh materi Rakordir telah dibahas.</p>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </ScrollArea>
            </main>
        </div>
    )
}