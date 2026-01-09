"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Loader2, ClipboardCheck, Layout } from "lucide-react"

// Import Sub-Komponen
import { MeetingLogistics } from "./meeting-logistics"
import { AttendanceSection } from "./attendance-section"
import { GuestSection } from "./guest-section"
import { MinutesEditor } from "./minutes-editor"
import { DecisionList } from "./decision-list"
import { SidebarInfo } from "./sidebar-info"

// Import UI & Logic
import { Button } from "@/components/ui/button"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"
import { saveMeetingRisalahAction } from "@/server/actions/meeting-actions"
import { MultiValue } from "react-select"
import { Agenda } from "@/db/schema/agendas"

interface Option {
    label: string;
    value: string;
}

interface DecisionItem {
    id: number;
    text: string;
}

interface Guest {
    id: number;
    name: string;
    position: string;
}

interface AttendanceRecord {
    status: string;
    reason?: string;
    proxy?: readonly Option[];
}

interface RadirMeetingClientProps {
    currentAgenda: Agenda;
}

export function RadirMeetingClient({ currentAgenda }: RadirMeetingClientProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- STATE MANAGEMENT (SINGLE SOURCE OF TRUTH) ---
    const [startTime, setStartTime] = useState(currentAgenda.startTime || "");
    const [endTime, setEndTime] = useState(currentAgenda.endTime || "");
    const [location, setLocation] = useState(currentAgenda.meetingLocation || "Ruang Rapat Direksi - Kantor Pusat");

    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>(
        DIREKTURE_PEMRAKARSA.reduce((acc, name) => ({ ...acc, [name]: { status: "Hadir" } }), {})
    );
    const [guests, setGuests] = useState<Guest[]>([]);
    const [selectedPimpinan, setSelectedPimpinan] = useState<MultiValue<Option>>([]);

    const [executiveSummary, setExecutiveSummary] = useState("");
    const [considerations, setConsiderations] = useState("");
    const [dissentingOpinion, setDissentingOpinion] = useState("");
    const [risalahBody, setRisalahBody] = useState("");
    const [decisions, setDecisions] = useState<DecisionItem[]>([{ id: Date.now(), text: "" }]);

    // Auto-fill Pimpinan dari data agenda
    useEffect(() => {
        if (currentAgenda.director) {
            const pimpinanArr = currentAgenda.director.split(',').map((d: string) => ({
                label: d.trim(),
                value: d.trim()
            }));
            setSelectedPimpinan(pimpinanArr);
        }
    }, [currentAgenda]);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const result = await saveMeetingRisalahAction({
                agendaId: currentAgenda.id,
                startTime,
                endTime,
                meetingLocation: location,
                pimpinanRapat: selectedPimpinan as Option[],
                attendanceData: attendance,
                guestParticipants: guests,
                executiveSummary,
                considerations,
                risalahBody,
                meetingDecisions: decisions,
                dissentingOpinion
            });

            if (result.success) {
                toast.success("Risalah Berhasil Disimpan", {
                    description: "Data rapat telah dikunci dan status agenda diperbarui."
                });
                router.push("/pelaksanaan-rapat/radir");
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch (e) {
            console.error(e);
            toast.error("Terjadi kesalahan sistem.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-20">
            {/* FLOATING ACTION BAR (COMPACT & FULL INFORMATION) */}
            <div className="sticky top-3 z-50 mb-6 px-4 md:px-0">
                <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-3 px-5 rounded-xl shadow-lg flex flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto">

                    {/* SISI KIRI: IDENTITAS FORM (INFO TETAP LENGKAP) */}
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#125d72] flex items-center justify-center text-white shadow-inner shrink-0">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                Formulir Digital
                            </p>
                            <p className="text-xs md:text-sm font-black text-[#125d72] uppercase tracking-tight leading-none">
                                Pelaksanaan Rapat Direksi
                            </p>
                        </div>
                    </div>

                    {/* SISI KANAN: TOMBOL AKSI (UKURAN PROPORSIONAL) */}
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-black text-[10px] md:text-xs px-6 h-10 rounded-lg shadow-md shadow-cyan-500/10 transition-all hover:scale-[1.02] active:scale-95 group"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : (
                            <Save className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                        )}
                        SIMPAN & FINALISASI RISALAH
                    </Button>
                </div>
            </div>

            {/* FORM GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-0">
                {/* Kolom Utama (Kiri) */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <MeetingLogistics
                            startTime={startTime} setStartTime={setStartTime}
                            endTime={endTime} setEndTime={setEndTime}
                            location={location} setLocation={setLocation}
                            executionDate={currentAgenda.executionDate || undefined}
                        />
                    </section>

                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <AttendanceSection
                            attendance={attendance}
                            setAttendance={setAttendance}
                        />
                    </section>

                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <MinutesEditor
                            value={risalahBody}
                            onChange={setRisalahBody}
                        />
                    </section>

                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <DecisionList
                            decisions={decisions}
                            setDecisions={setDecisions}
                        />
                    </section>
                </div>

                {/* Kolom Sidebar (Kanan) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-32">
                        <section className="animate-in fade-in slide-in-from-right-4 duration-700 space-y-6">
                            <SidebarInfo
                                selectedPimpinan={selectedPimpinan}
                                setSelectedPimpinan={setSelectedPimpinan}
                                executiveSummary={executiveSummary}
                                setExecutiveSummary={setExecutiveSummary}
                                considerations={considerations}
                                setConsiderations={setConsiderations}
                                dissentingOpinion={dissentingOpinion}
                                setDissentingOpinion={setDissentingOpinion}
                            />
                            <GuestSection
                                guests={guests}
                                setGuests={setGuests}
                            />
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}