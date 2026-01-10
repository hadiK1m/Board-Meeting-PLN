"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Save,
    Loader2,
    ChevronRight,
    Menu,
    FileText,
    CheckCircle2,
    ArrowLeft,
    Download,
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"

// Import Sub-Komponen Terpisah
import { MeetingLogisticsSection } from "./meeting-logistics-section"
import { AttendanceAndLeadershipSection } from "./attendance-and-leadership-section"
import { ExecutiveSummarySection } from "./executive-summary-section"
import { ConsiderationsSection } from "./considerations-section"
import { MeetingDecisionsSection } from "./meeting-decisions-section"
import { DissentingOpinionSection } from "./dissenting-opinion-section"

// Import UI & Logic
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"
import { saveMeetingRisalahAction } from "@/server/actions/meeting-actions"
import { Agenda } from "@/db/schema/agendas"
import { cn } from "@/lib/utils"

interface Option { label: string; value: string }
interface DecisionItem { id: string; text: string }
interface Guest { id: number; name: string; position: string }
interface AttendanceRecord { status: string; reason?: string; proxy?: readonly Option[] }
interface ConsiderationItem { id: string; text: string }

interface GlobalDraft {
    startTime: string
    endTime: string
    meetingLocation: string
    attendanceData: Record<string, AttendanceRecord>
    guestParticipants: Guest[]
    pimpinanRapat: readonly Option[] // FIX POINT 2: Gunakan readonly agar match dengan react-select
}

interface AgendaSpecificDraft {
    executiveSummary: string
    considerations: ConsiderationItem[]
    meetingDecisions: DecisionItem[]
    dissentingOpinion: string
}

interface BulkMeetingClientProps {
    agendas: Agenda[]
    meetingTitle: string
    initialMeetingNumber?: string
    initialMeetingYear?: string
}

export function BulkMeetingClient({
    agendas,
    meetingTitle,
    initialMeetingNumber,
    initialMeetingYear,
}: BulkMeetingClientProps) {
    const router = useRouter()
    const [activeAgendaId, setActiveAgendaId] = useState<string>(agendas[0]?.id || "")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [risalahGroupId, setRisalahGroupId] = useState<string | null>(null)

    const activeAgenda = agendas.find((a) => a.id === activeAgendaId) || agendas[0]

    useEffect(() => {
        const savedGroupId = localStorage.getItem("lastRisalahGroupId")
        if (savedGroupId) {
            setRisalahGroupId(savedGroupId)
        }
    }, [])

    // ── GLOBAL STATE ──
    const [globalDraft, setGlobalDraft] = useState<GlobalDraft>({
        startTime: agendas[0]?.startTime || "",
        endTime: agendas[0]?.endTime || "Selesai",
        meetingLocation: agendas[0]?.meetingLocation || "Ruang Rapat Direksi - Kantor Pusat",
        attendanceData:
            (agendas[0]?.attendanceData as Record<string, AttendanceRecord>) ||
            DIREKTURE_PEMRAKARSA.reduce((acc, name) => ({ ...acc, [name]: { status: "Hadir" } }), {}),
        guestParticipants: (agendas[0]?.guestParticipants as Guest[]) || [],
        pimpinanRapat: agendas[0]?.director
            ? agendas[0].director.split(",").map((d) => ({ label: d.trim(), value: d.trim() }))
            : [],
    })

    // ── SPESIFIK STATE ──
    const [specificDrafts, setSpecificDrafts] = useState<Record<string, AgendaSpecificDraft>>(() => {
        const initial: Record<string, AgendaSpecificDraft> = {}
        agendas.forEach((a) => {
            let considerationsArray: ConsiderationItem[] = []
            if (typeof a.considerations === "string" && a.considerations.trim()) {
                considerationsArray = a.considerations
                    .split(/[\n;]/)
                    .filter(Boolean)
                    .map((text, idx) => ({ id: `init-${idx}-${Date.now()}`, text: text.trim() }))
            } else if (Array.isArray(a.considerations)) {
                considerationsArray = (a.considerations as ConsiderationItem[]).map((item) => ({
                    id: item.id || Math.random().toString(36).slice(2),
                    text: item.text || "",
                }))
            }

            initial[a.id] = {
                executiveSummary: a.executiveSummary || "",
                considerations: considerationsArray,
                meetingDecisions: (a.meetingDecisions as DecisionItem[]) || [{ id: Date.now().toString(), text: "" }],
                dissentingOpinion: a.dissentingOpinion || "",
            }
        })
        return initial
    })

    const currentSpecific = specificDrafts[activeAgendaId] || {
        executiveSummary: "",
        considerations: [],
        meetingDecisions: [],
        dissentingOpinion: "",
    }

    // FIX POINT 1: Hapus 'as any', biarkan TypeScript infer dari generic K
    const updateGlobal = <K extends keyof GlobalDraft>(
        field: K,
        value: GlobalDraft[K] | ((prev: GlobalDraft[K]) => GlobalDraft[K])
    ) => {
        setGlobalDraft((prev) => {
            const currentValue = prev[field]
            const newValue = typeof value === "function" ? (value as Function)(currentValue) : value
            return { ...prev, [field]: newValue }
        })
    }

    const updateSpecific = <K extends keyof AgendaSpecificDraft>(
        field: K,
        value: AgendaSpecificDraft[K] | ((prev: AgendaSpecificDraft[K]) => AgendaSpecificDraft[K])
    ) => {
        setSpecificDrafts((prev) => {
            const current = prev[activeAgendaId] || {
                executiveSummary: "",
                considerations: [],
                meetingDecisions: [],
                dissentingOpinion: "",
            }
            // FIX POINT 1: Casting ke Function lebih aman daripada 'any' jika diperlukan, tapi 'value(current[field])' biasanya cukup
            const newValue = typeof value === "function" ? (value as Function)(current[field]) : value
            return {
                ...prev,
                [activeAgendaId]: { ...current, [field]: newValue },
            }
        })
    }

    const handleSave = async () => {
        if (!activeAgendaId) return

        setIsSubmitting(true)
        try {
            const considerationsString = currentSpecific.considerations
                .map((item) => item.text.trim())
                .filter(Boolean)
                .join("\n")

            const groupId = risalahGroupId || uuidv4()
            if (!risalahGroupId) {
                setRisalahGroupId(groupId)
                localStorage.setItem("lastRisalahGroupId", groupId)
            }

            const result = await saveMeetingRisalahAction({
                agendaId: activeAgendaId,
                startTime: globalDraft.startTime,
                endTime: globalDraft.endTime,
                meetingLocation: globalDraft.meetingLocation,
                meetingNumber: initialMeetingNumber,
                meetingYear: initialMeetingYear,
                pimpinanRapat: globalDraft.pimpinanRapat as Option[], // FIX POINT 3: Casting aman karena server butuh mutable array
                attendanceData: globalDraft.attendanceData,
                guestParticipants: globalDraft.guestParticipants,
                executiveSummary: currentSpecific.executiveSummary,
                considerations: currentSpecific.considerations, // Pastikan server action terima array atau sesuaikan
                risalahBody: currentSpecific.executiveSummary,
                meetingDecisions: currentSpecific.meetingDecisions,
                dissentingOpinion: currentSpecific.dissentingOpinion,
            })

            if (result.success) {
                toast.success("Progress Berhasil Disimpan")
                router.refresh()
            } else {
                toast.error(result.error || "Gagal menyimpan data")
            }
        } catch {
            toast.error("Terjadi kesalahan sistem.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const AgendaSidebarList = () => (
        <div className="flex flex-col h-full min-h-0">
            <div className="px-4 py-4 shrink-0">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-[10px] font-bold uppercase text-slate-500 border-dashed"
                    onClick={() => router.push("/pelaksanaan-rapat/radir")}
                >
                    <ArrowLeft className="h-3 w-3" /> Kembali ke List
                </Button>
            </div>
            <Separator />
            <div className="px-4 py-4 shrink-0">
                <h3 className="text-[11px] font-black text-[#125d72] uppercase tracking-widest flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#125d72] animate-pulse" />
                    Urutan Agenda ({agendas.length})
                </h3>
            </div>
            <ScrollArea className="flex-1 min-h-0 px-2 pb-4">
                <div className="space-y-1.5">
                    {agendas.map((item, index) => (
                        <button
                            key={item.id}
                            className={cn(
                                "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left group",
                                activeAgendaId === item.id ? "bg-white shadow-md border border-[#125d72]/20" : "hover:bg-slate-200/50 text-slate-500 border border-transparent"
                            )}
                            onClick={() => setActiveAgendaId(item.id)}
                        >
                            <div className={cn("flex items-center justify-center min-w-7 h-7 rounded-lg text-[11px] font-black", activeAgendaId === item.id ? "bg-[#125d72] text-white" : "bg-slate-200")}>
                                {index + 1}
                            </div>
                            <div className="overflow-hidden">
                                <p className={cn("text-[11px] font-bold truncate", activeAgendaId === item.id ? "text-[#125d72]" : "text-slate-700")}>{item.title}</p>
                                <p className="text-[9px] uppercase font-bold opacity-50 truncate mt-1">{item.director}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50">
            <aside className="hidden w-72 flex-col border-r bg-slate-100/40 md:flex overflow-hidden">
                <div className="p-5 border-b bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#125d72] rounded-lg shadow-lg">
                            <FileText className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="font-black text-[11px] text-[#125d72] uppercase tracking-tighter">{meetingTitle}</h1>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <AgendaSidebarList />
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
                <header className="shrink-0 bg-white/80 backdrop-blur-md border-b h-16 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0 h-full overflow-hidden">
                                <AgendaSidebarList />
                            </SheetContent>
                        </Sheet>
                        <div className="flex flex-col">
                            <Badge className="bg-[#125d72] text-[9px] font-bold h-4 w-fit">AGENDA SEDANG DIBAHAS</Badge>
                            <h2 className="text-sm font-black text-slate-800 uppercase truncate max-w-xl">{activeAgenda.title}</h2>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={handleSave} disabled={isSubmitting} className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-black text-[11px] px-6 h-10 rounded-xl shadow-lg transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                            SIMPAN RISALAH
                        </Button>

                        {risalahGroupId && (
                            <Button variant="outline" className="text-[#125d72] border-[#125d72] hover:bg-[#125d72]/5 text-[11px] font-black h-10 rounded-xl shadow-sm flex gap-2" onClick={() => toast.info(`Export group ID: ${risalahGroupId}`)}>
                                <Download className="h-4 w-4" /> EXPORT DOCX
                            </Button>
                        )}
                    </div>
                </header>

                <ScrollArea className="flex-1 min-h-0 bg-slate-50/30">
                    <div className="w-full p-6 space-y-8 pb-32">
                        <MeetingLogisticsSection
                            startTime={globalDraft.startTime}
                            setStartTime={(val) => updateGlobal("startTime", val)}
                            endTime={globalDraft.endTime}
                            setEndTime={(val) => updateGlobal("endTime", val)}
                            location={globalDraft.meetingLocation}
                            setLocation={(val) => updateGlobal("meetingLocation", val)}
                            executionDate={activeAgenda.executionDate || undefined}
                        />

                        <AttendanceAndLeadershipSection
                            attendance={globalDraft.attendanceData}
                            setAttendance={(val) => updateGlobal("attendanceData", val)}
                            guests={globalDraft.guestParticipants}
                            setGuests={(val) => updateGlobal("guestParticipants", val)}
                            selectedPimpinan={globalDraft.pimpinanRapat}
                            setSelectedPimpinan={(val) => updateGlobal("pimpinanRapat", val)}
                        />

                        <ExecutiveSummarySection value={currentSpecific.executiveSummary} onChange={(val) => updateSpecific("executiveSummary", val)} />
                        <ConsiderationsSection considerations={currentSpecific.considerations} setConsiderations={(val) => updateSpecific("considerations", val)} />
                        <MeetingDecisionsSection decisions={currentSpecific.meetingDecisions} setDecisions={(val) => updateSpecific("meetingDecisions", val)} />
                        <DissentingOpinionSection value={currentSpecific.dissentingOpinion} onChange={(val) => updateSpecific("dissentingOpinion", val)} />

                        <div className="flex justify-center pt-8">
                            {(() => {
                                const currentIndex = agendas.findIndex(a => a.id === activeAgendaId)
                                const nextAgenda = agendas[currentIndex + 1]
                                if (nextAgenda) {
                                    return (
                                        <Button size="lg" className="w-full max-w-md h-14 bg-[#125d72] text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl gap-3 transition-transform active:scale-95" onClick={() => setActiveAgendaId(nextAgenda.id)}>
                                            BAHAS AGENDA BERIKUTNYA <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    )
                                }
                                return (
                                    <div className="p-8 bg-green-50 border-2 border-dashed border-green-200 rounded-3xl flex flex-col items-center text-center w-full max-w-md">
                                        <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
                                        <p className="text-xs font-black text-green-700 uppercase tracking-widest">Sesi Selesai</p>
                                        <p className="text-[10px] text-green-600/70 font-bold mt-1">Seluruh agenda dalam sesi ini telah dibahas.</p>
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