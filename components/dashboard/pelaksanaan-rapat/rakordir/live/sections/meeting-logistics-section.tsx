// components/dashboard/pelaksanaan-rapat/rakordir/live/sections/meeting-logistics-section.tsx
"use client"

import React from "react"
import {
    Clock,
    MapPin,
    CalendarDays,
    Timer,
    TimerOff,
    Navigation,
    Info,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"

interface MeetingLogisticsSectionProps {
    startTime: string
    setStartTime: (val: string) => void
    endTime: string
    setEndTime: (val: string) => void
    location: string
    setLocation: (val: string) => void
    executionDate?: string
}

export function MeetingLogisticsSection({
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    location,
    setLocation,
    executionDate,
}: MeetingLogisticsSectionProps) {
    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            {/* SUB-HEADER LOGISTIK */}
            <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#125d72] rounded-lg shadow-sm shadow-[#125d72]/20">
                        <CalendarDays className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#125d72]">
                            Logistik & Lokasi
                        </h4>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                            {executionDate
                                ? format(new Date(executionDate), "EEEE, dd MMMM yyyy", { locale: localeID })
                                : "Tanggal pelaksanaan belum dipilih"}
                        </p>
                    </div>
                </div>

                <Badge variant="outline" className="bg-white border-slate-200 text-[#125d72] font-black text-[9px] px-3 py-1 uppercase tracking-widest shadow-sm">
                    Global Session Info
                </Badge>
            </div>

            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Waktu Mulai */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Timer className="h-3 w-3" /> Jam Mulai
                        </label>
                        <div className="relative group">
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="h-11 bg-slate-50/50 border-slate-200 font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-[#14a2ba] rounded-xl transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Waktu Selesai */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <TimerOff className="h-3 w-3" /> Jam Selesai
                        </label>
                        <Input
                            placeholder="Selesai / TBD"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="h-11 bg-slate-50/50 border-slate-200 font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-[#14a2ba] rounded-xl transition-all shadow-sm"
                        />
                    </div>

                    {/* Lokasi Rapat */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Navigation className="h-3 w-3" /> Tempat Pelaksanaan
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-[#14a2ba] transition-colors" />
                            </div>
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Cth: Ruang Rapat Lt. 3"
                                className="h-11 pl-10 bg-slate-50/50 border-slate-200 font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-[#14a2ba] rounded-xl transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* FOOTER INFO */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-[#14a2ba]" />
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight italic">
                    Perubahan pada bagian ini akan disinkronkan ke seluruh agenda dalam sesi Rakordir ini secara otomatis.
                </p>
            </div>
        </Card>
    )
}