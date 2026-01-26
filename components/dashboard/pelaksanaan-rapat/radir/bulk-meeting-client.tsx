/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useState } from "react"
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
    Trash2,
    AlertCircle,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"
import { saveMeetingRisalahAction, finishMeetingAction, removeAgendaFromSessionAction } from "@/server/actions/meeting-actions"
import { exportRisalahToDocx } from "@/server/actions/export-actions"
import { Agenda } from "@/db/schema/agendas"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Import sheet/detail component (pastikan path ini sesuai di repo Anda)
// named export component + exported type
import { DetailRadirSheet, AgendaDetail } from "@/components/dashboard/agenda/radir/detail-radir-sheet"

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
    pimpinanRapat: readonly Option[]
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

    // State lokal untuk agendas (mutable)
    const [localAgendas, setLocalAgendas] = useState<Agenda[]>(agendas)
    const activeAgenda = localAgendas.find((a) => a.id === activeAgendaId) || localAgendas[0]

    // NEW: State untuk Detail Sheet
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<Agenda | null>(null)

    // Handler hapus agenda dari sesi
    const handleRemoveAgenda = async (agendaId: string) => {
        setIsSubmitting(true)
        try {
            const result = await removeAgendaFromSessionAction(agendaId)
            if (result.success) {
                toast.success(result.message)

                // Update state lokal
                const newAgendas = localAgendas.filter(a => a.id !== agendaId)
                setLocalAgendas(newAgendas)

                // Jika tidak ada agenda lagi → kembali ke monitoring
                if (newAgendas.length === 0) {
                    toast.info("Sesi rapat kosong, kembali ke daftar.")
                    router.push("/pelaksanaan-rapat/radir")
                    return
                }

                // Pindah ke agenda lain (next atau first)
                const currentIndex = localAgendas.findIndex(a => a.id === activeAgendaId)
                const nextIndex = currentIndex >= newAgendas.length ? newAgendas.length - 1 : currentIndex
                if (nextIndex >= 0) {
                    setActiveAgendaId(newAgendas[nextIndex].id)
                }
            } else {
                toast.error(result.error || "Gagal menghapus agenda")
            }
        } catch (err) {
            toast.error("Kesalahan sistem")
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── PERBAIKAN GLOBAL STATE: DEFAULT HADIR ──
    const [globalDraft, setGlobalDraft] = useState<GlobalDraft>(() => {
        // Cek apakah data dari database sudah ada
        const existingAttendance = agendas[0]?.attendanceData as Record<string, AttendanceRecord> | undefined

        // Jika data attendance di DB kosong/null, buat default HADIR untuk SEMUA direktur
        const defaultAttendance = DIREKTURE_PEMRAKARSA.reduce((acc, name) => ({
            ...acc,
            [name]: { status: "Hadir", reason: "", proxy: [] }
        }), {} as Record<string, AttendanceRecord>)

        return {
            startTime: agendas[0]?.startTime || "",
            endTime: agendas[0]?.endTime || "Selesai",
            meetingLocation: agendas[0]?.meetingLocation || "Ruang Rapat Direksi - Kantor Pusat",
            attendanceData: (existingAttendance && Object.keys(existingAttendance).length > 0)
                ? existingAttendance
                : defaultAttendance,
            guestParticipants: (agendas[0]?.guestParticipants as Guest[]) || [],
            pimpinanRapat: agendas[0]?.director
                ? agendas[0].director.split(",").map((d) => ({ label: d.trim(), value: d.trim() }))
                : [],
        }
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

    const updateGlobal = <K extends keyof GlobalDraft>(
        field: K,
        value: GlobalDraft[K] | ((prev: GlobalDraft[K]) => GlobalDraft[K])
    ) => {
        setGlobalDraft((prev) => {
            const currentValue = prev[field]
            let newValue: GlobalDraft[K]
            if (typeof value === "function") {
                const fn = value as (p: GlobalDraft[K]) => GlobalDraft[K]
                newValue = fn(currentValue)
            } else {
                newValue = value as GlobalDraft[K]
            }
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
            let newValue: AgendaSpecificDraft[K]
            if (typeof value === "function") {
                const fn = value as (p: AgendaSpecificDraft[K]) => AgendaSpecificDraft[K]
                newValue = fn(current[field])
            } else {
                newValue = value as AgendaSpecificDraft[K]
            }
            return {
                ...prev,
                [activeAgendaId]: { ...current, [field]: newValue },
            }
        })
    }

    const handleSave = async () => {
        setIsSubmitting(true)
        try {
            let groupId = localStorage.getItem("lastRisalahGroupId")
            if (!groupId) {
                groupId = uuidv4()
                localStorage.setItem("lastRisalahGroupId", groupId)
            }

            // 1. Simpan Konten Risalah per Agenda (hanya agenda yang masih ada di localAgendas)
            const savePromises = localAgendas.map((agenda) => {
                const draft = specificDrafts[agenda.id];
                const considerationsString = draft.considerations
                    .map((item) => item.text.trim())
                    .filter(Boolean)
                    .join("\n");

                return saveMeetingRisalahAction({
                    agendaId: agenda.id,
                    startTime: globalDraft.startTime,
                    endTime: globalDraft.endTime,
                    meetingLocation: globalDraft.meetingLocation,
                    meetingNumber: initialMeetingNumber,
                    meetingYear: initialMeetingYear,
                    pimpinanRapat: globalDraft.pimpinanRapat as Option[],
                    attendanceData: globalDraft.attendanceData,
                    guestParticipants: globalDraft.guestParticipants,
                    executiveSummary: draft.executiveSummary,
                    considerations: considerationsString,
                    risalahBody: draft.executiveSummary,
                    meetingDecisions: draft.meetingDecisions,
                    dissentingOpinion: draft.dissentingOpinion,
                    risalahGroupId: groupId
                });
            });

            const results = await Promise.all(savePromises);

            // 2. Jika Berhasil Disimpan, Ubah Status Menjadi RAPAT_SELESAI
            if (results.every(res => res.success)) {

                if (initialMeetingNumber && initialMeetingYear) {
                    const finishRes = await finishMeetingAction(initialMeetingNumber, initialMeetingYear)

                    if (finishRes.success) {
                        toast.success("Risalah disimpan & Status Rapat Selesai")
                        router.push("/monev/radir") // Opsional: Redirect langsung ke Monev
                    } else {
                        toast.error("Risalah tersimpan, tapi gagal update status selesai")
                    }
                } else {
                    toast.success("Progress Berhasil Disimpan (Tanpa Finish)")
                }

                router.refresh()
            } else {
                toast.error("Gagal menyimpan beberapa agenda.");
            }
        } catch (err: unknown) {
            console.error(err)
            toast.error("Terjadi kesalahan sistem.");
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFinishMeeting = async () => {
        if (!initialMeetingNumber || !initialMeetingYear) {
            toast.error("Nomor referensi rapat tidak ditemukan.")
            return
        }

        const confirm = window.confirm("Apakah Anda yakin ingin menyelesaikan rapat ini? Status akan berubah menjadi RAPAT_SELESAI dan masuk ke tahap Monev.")
        if (!confirm) return

        setIsSubmitting(true)
        try {
            const result = await finishMeetingAction(initialMeetingNumber, initialMeetingYear)
            if (result.success) {
                toast.success("Rapat berhasil diselesaikan!")
                router.push("/monev/radir")
            } else {
                toast.error(result.error || "Gagal menyelesaikan rapat.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Terjadi kesalahan sistem.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleExport = async () => {
        if (!initialMeetingNumber || !initialMeetingYear) {
            toast.error("Nomor atau Tahun Rapat tidak ditemukan.");
            return;
        }

        setIsSubmitting(true);
        try {
            toast.info("Sedang menyiapkan dokumen DOCX...");
            const result = await exportRisalahToDocx(initialMeetingNumber, initialMeetingYear);

            if (result.success && result.data) {
                const link = document.createElement("a");
                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.data}`;
                link.download = result.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Risalah berhasil diunduh.");
            } else {
                toast.error(result.error || "Gagal export.");
            }
        } catch (err: unknown) {
            console.error(err);
            toast.error("Kesalahan sistem saat export.");
        } finally {
            setIsSubmitting(false);
        }
    }

    // --- helper: normalisasi Agenda untuk DetailRadirSheet ---
    function normalizeAgendaForDetail(a: Agenda | null): AgendaDetail | null {
        if (!a) return null

        // Ambil nilai dari berbagai nama kemungkinan field
        const rawSupporting = (a as any).supportingDocuments ?? (a as any).supporting_documents ?? null

        // Normalisasi supportingDocuments => string | string[] | null
        let supportingDocuments: string | string[] | null = null
        try {
            if (rawSupporting == null) supportingDocuments = null
            else if (Array.isArray(rawSupporting)) supportingDocuments = rawSupporting.map(String)
            else if (typeof rawSupporting === "string") {
                const trimmed = rawSupporting.trim()
                if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
                    try {
                        const parsed = JSON.parse(trimmed)
                        supportingDocuments = Array.isArray(parsed) ? parsed.map(String) : String(rawSupporting)
                    } catch {
                        supportingDocuments = String(rawSupporting)
                    }
                } else {
                    supportingDocuments = String(rawSupporting)
                }
            } else {
                supportingDocuments = JSON.stringify(rawSupporting)
            }
        } catch {
            supportingDocuments = null
        }

        const agendaDetail: AgendaDetail = {
            id: a.id,
            title: a.title ?? "",
            urgency: (a as any).urgency ?? null,
            priority: (a as any).priority ?? null,
            deadline: (a as any).deadline ?? null,
            director: (a as any).director ?? null,
            initiator: (a as any).initiator ?? null,
            support: (a as any).support ?? null,
            contact_person: (a as any).contact_person ?? (a as any).contactPerson ?? null,
            contactPerson: (a as any).contactPerson ?? (a as any).contact_person ?? null,
            position: (a as any).position ?? null,
            phone: (a as any).phone ?? null,
            legal_review: (a as any).legal_review ?? (a as any).legalReview ?? null,
            legalReview: (a as any).legalReview ?? (a as any).legal_review ?? null,
            risk_review: (a as any).risk_review ?? (a as any).riskReview ?? null,
            riskReview: (a as any).riskReview ?? (a as any).risk_review ?? null,
            compliance_review: (a as any).compliance_review ?? (a as any).complianceReview ?? null,
            complianceReview: (a as any).complianceReview ?? (a as any).compliance_review ?? null,
            regulation_review: (a as any).regulation_review ?? (a as any).regulationReview ?? null,
            regulationReview: (a as any).regulationReview ?? (a as any).regulation_review ?? null,
            recommendation_note: (a as any).recommendation_note ?? (a as any).recommendationNote ?? null,
            recommendationNote: (a as any).recommendationNote ?? (a as any).recommendation_note ?? null,
            proposal_note: (a as any).proposal_note ?? (a as any).proposalNote ?? null,
            proposalNote: (a as any).proposalNote ?? (a as any).proposal_note ?? null,
            presentation_material: (a as any).presentation_material ?? (a as any).presentationMaterial ?? null,
            presentationMaterial: (a as any).presentationMaterial ?? (a as any).presentation_material ?? null,
            supporting_documents: Array.isArray(supportingDocuments) ? supportingDocuments : (supportingDocuments ? supportingDocuments : null),
            supportingDocuments: supportingDocuments,
            status: (a as any).status ?? null,
            notRequiredFiles: (a as any).notRequiredFiles ?? null,
            createdAt: (a as any).createdAt ?? (a as any).created_at ?? null,
            updatedAt: (a as any).updatedAt ?? (a as any).updated_at ?? null,
        }

        return agendaDetail
    }

    const AgendaSidebarList = () => (
        <div className="flex flex-col h-full min-h-0">
            <div className="px-4 py-4 shrink-0">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-[10px] font-bold uppercase text-slate-500 border-dashed" onClick={() => router.push("/pelaksanaan-rapat/radir")}>
                    <ArrowLeft className="h-3 w-3" /> Kembali ke List
                </Button>
            </div>
            <Separator />
            <div className="px-4 py-4 shrink-0">
                <h3 className="text-[11px] font-black text-[#125d72] uppercase tracking-widest flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#125d72] animate-pulse" />
                    Urutan Agenda ({localAgendas.length})
                </h3>
            </div>
            <ScrollArea className="flex-1 min-h-0 px-2 pb-4">
                <div className="space-y-1.5">
                    {localAgendas.map((item, index) => (
                        <div
                            key={item.id}
                            className={cn(
                                "w-full flex items-center gap-3 p-4 pr-12 rounded-xl transition-all text-left group relative cursor-pointer",
                                activeAgendaId === item.id
                                    ? "bg-white shadow-md border border-[#125d72]/20"
                                    : "hover:bg-slate-200/50 text-slate-500 border border-transparent"
                            )}
                            onClick={() => setActiveAgendaId(item.id)}
                        >
                            <div className={cn(
                                "flex items-center justify-center min-w-7 h-7 rounded-lg text-[11px] font-black",
                                activeAgendaId === item.id ? "bg-[#125d72] text-white" : "bg-slate-200"
                            )}>
                                {index + 1}
                            </div>
                            <div className="overflow-hidden flex-1 min-w-0">
                                {/* TITEL SEKARANG BISA DIKLIK untuk membuka detail */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation(); // jangan ubah activeAgendaId saat buka detail
                                        setSelectedDetail(item);
                                        setDetailOpen(true);
                                    }}
                                    className={cn(
                                        "text-[11px] font-bold line-clamp-2 leading-tight text-left w-full",
                                        activeAgendaId === item.id ? "text-[#125d72]" : "text-slate-700"
                                    )}
                                >
                                    {item.title}
                                </button>

                                <p className="text-[9px] uppercase font-bold opacity-50 truncate mt-1">{item.director}</p>
                            </div>

                            {/* TOMBOL DELETE */}
                            {localAgendas.length > 1 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 absolute right-3 top-1/2 -translate-y-1/2 transition-all"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-3 text-lg">
                                                <AlertCircle className="h-8 w-8 text-red-600" />
                                                Peringatan: Keluarkan Agenda?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-base space-y-2">
                                                <p>Anda akan <span className="font-bold text-red-600">mengeluarkan agenda ini</span> dari sesi rapat:</p>
                                                <p className="font-black text-[#125d72] bg-slate-100 px-3 py-2 rounded-lg">
                                                    {item.title}
                                                </p>
                                                <p className="mt-3">
                                                    <strong>Konsekuensi:</strong><br />
                                                    • Semua data risalah <strong>(ringkasan, pertimbangan, keputusan, dissenting)</strong> pada agenda ini akan direset.<br />
                                                    • Data global (waktu, lokasi, kehadiran) dan risalah agenda lain <strong>tetap aman 100%</strong>.<br />
                                                    • Agenda ini akan kembali ke daftar &quot;Siap Dibahas&quot;.
                                                </p>
                                                <p className="mt-3 text-sm italic text-slate-500">
                                                    Tindakan ini tidak bisa dibatalkan secara otomatis.
                                                </p>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-red-600 hover:bg-red-700"
                                                onClick={() => handleRemoveAgenda(item.id)}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                Ya, Keluarkan Agenda
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
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
                <div className="flex-1 min-h-0"><AgendaSidebarList /></div>
            </aside>

            <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
                <header className="shrink-0 bg-white/80 backdrop-blur-md border-b h-16 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Sheet>
                            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button></SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0 h-full overflow-hidden"><AgendaSidebarList /></SheetContent>
                        </Sheet>
                        <div className="flex flex-col min-w-0 flex-1">
                            <Badge className="bg-[#125d72] text-[9px] font-bold h-4 w-fit">
                                AGENDA SEDANG DIBAHAS
                            </Badge>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h2 className="text-sm font-black text-slate-800 uppercase line-clamp-2 mt-1 leading-tight">
                                            {activeAgenda.title}
                                        </h2>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-md bg-slate-800 text-white">
                                        <p className="text-xs font-medium">{activeAgenda.title}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleSave} disabled={isSubmitting} className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-black text-[11px] px-6 h-10 rounded-xl shadow-lg transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                            SIMPAN SEMUA RISALAH
                        </Button>
                        <Button variant="outline" className="text-[#125d72] border-[#125d72] hover:bg-[#125d72]/5 text-[11px] font-black h-10 rounded-xl shadow-sm transition-all flex gap-2" onClick={handleExport}>
                            <Download className="h-4 w-4" /> EXPORT DOCX
                        </Button>
                    </div>
                </header>

                <ScrollArea className="flex-1 min-h-0 bg-slate-50/30">
                    <div className="w-full p-6 space-y-8 pb-32">
                        <MeetingLogisticsSection startTime={globalDraft.startTime} setStartTime={(val) => updateGlobal("startTime", val)} endTime={globalDraft.endTime} setEndTime={(val) => updateGlobal("endTime", val)} location={globalDraft.meetingLocation} setLocation={(val) => updateGlobal("meetingLocation", val)} executionDate={activeAgenda?.executionDate || undefined} />
                        <AttendanceAndLeadershipSection attendance={globalDraft.attendanceData} setAttendance={(val) => updateGlobal("attendanceData", val)} guests={globalDraft.guestParticipants} setGuests={(val) => updateGlobal("guestParticipants", val)} selectedPimpinan={globalDraft.pimpinanRapat} setSelectedPimpinan={(val) => updateGlobal("pimpinanRapat", val)} />
                        <ExecutiveSummarySection value={currentSpecific.executiveSummary} onChange={(val) => updateSpecific("executiveSummary", val)} />
                        <ConsiderationsSection
                            // FIX 1: Map data agar 'level' selalu ada (default 0)
                            considerations={(activeAgenda.considerations || []).map((c: any) => ({
                                ...c,
                                level: c.level ?? 0
                            }))}

                            // FIX 2: Handle update state
                            setConsiderations={(newItems) => {
                                // Jika newItems berupa function (prev => ...), kita harus handle itu atau simplifikasi
                                // Karena logic parent biasanya mengharapkan value langsung, kita asumsikan newItems adalah array hasil
                                // Namun component ConsiderationsSection mengirim items[] | func.

                                // Kita paksa ambil valuenya dengan casting aman jika perlu
                                const itemsToSave = typeof newItems === 'function'
                                    ? newItems(activeAgenda.considerations as any[])
                                    : newItems;

                                updateAgendaState(activeAgenda.id, { considerations: itemsToSave })
                            }}
                            activeAgendaTitle={activeAgenda.title}
                        />
                        <MeetingDecisionsSection decisions={currentSpecific.meetingDecisions} setDecisions={(val) => updateSpecific("meetingDecisions", val)} />
                        <DissentingOpinionSection value={currentSpecific.dissentingOpinion} onChange={(val) => updateSpecific("dissentingOpinion", val)} />

                        <div className="flex justify-center pt-8">
                            {(() => {
                                const currentIndex = localAgendas.findIndex(a => a.id === activeAgendaId)
                                const nextAgenda = localAgendas[currentIndex + 1]
                                if (nextAgenda) return <Button size="lg" className="w-full max-w-md h-14 bg-[#125d72] text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl gap-3 transition-transform active:scale-95" onClick={() => setActiveAgendaId(nextAgenda.id)}>BAHAS AGENDA BERIKUTNYA <ChevronRight className="h-5 w-5" /></Button>
                                return (
                                    <div className="p-8 bg-green-50 border-2 border-dashed border-green-200 rounded-3xl flex flex-col items-center text-center w-full max-w-md space-y-4">
                                        <div>
                                            <CheckCircle2 className="h-8 w-8 text-green-600 mb-2 mx-auto" />
                                            <p className="text-xs font-black text-green-700 uppercase tracking-widest">Sesi Selesai</p>
                                            <p className="text-[10px] text-green-600/70 font-bold mt-1">Seluruh agenda dalam sesi ini telah dibahas.</p>
                                        </div>

                                        <Button
                                            onClick={handleFinishMeeting}
                                            disabled={isSubmitting}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                            SELESAIKAN RAPAT & KE MONEV
                                        </Button>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </ScrollArea>
            </main>

            {/* DETAIL SHEET - tampilkan file & data agenda */}
            <DetailRadirSheet
                agenda={normalizeAgendaForDetail(selectedDetail)}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    )
}