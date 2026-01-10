// components/dashboard/pelaksanaan-rapat/radir/meeting-logistics-section.tsx
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
            <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#125d72]/10 flex items-center justify-center">
                        <CalendarDays className="h-4 w-4 text-[#125d72]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                        Detail Pelaksanaan
                    </span>
                </div>

                {executionDate && (
                    <Badge
                        variant="outline"
                        className="bg-white border-slate-200 text-[#125d72] text-[9px] font-black py-0.5 px-3 rounded-md shadow-sm"
                    >
                        {format(new Date(executionDate), "EEEE, dd MMMM yyyy", { locale: localeID }).toUpperCase()}
                    </Badge>
                )}
            </div>

            <CardContent className="p-5 md:p-6">
                {/* GRID FORM: Responsive 1, 2, atau 3 kolom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                    {/* INPUT: JAM MULAI */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Timer className="h-3.5 w-3.5 text-[#14a2ba]" />
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                Waktu Mulai
                            </label>
                        </div>
                        <div className="relative group">
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="h-10 bg-slate-50/50 border-slate-200 font-bold text-[#125d72] focus:bg-white focus:ring-1 focus:ring-[#14a2ba] rounded-lg transition-all shadow-sm group-hover:border-[#14a2ba]/50"
                            />
                        </div>
                    </div>

                    {/* INPUT: JAM SELESAI */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <TimerOff className="h-3.5 w-3.5 text-red-400" />
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                Waktu Selesai
                            </label>
                        </div>
                        <div className="relative group">
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="h-10 bg-slate-50/50 border-slate-200 font-bold text-[#125d72] focus:bg-white focus:ring-1 focus:ring-[#14a2ba] rounded-lg transition-all shadow-sm group-hover:border-[#14a2ba]/50"
                            />
                        </div>
                    </div>

                    {/* INPUT: LOKASI */}
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-2">
                            <Navigation className="h-3.5 w-3.5 text-amber-500" />
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                Lokasi Rapat
                            </label>
                        </div>
                        <div className="relative group">
                            {/* Ikon diposisikan absolute di kiri */}
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-[#14a2ba] transition-colors" />
                            </div>

                            {/* Input dengan padding kiri */}
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Cth: Ruang Rapat Lt. 3"
                                className="h-10 pl-10 bg-slate-50/50 border-slate-200 font-semibold text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-[#14a2ba] rounded-lg transition-all shadow-sm group-hover:border-[#14a2ba]/50 w-full"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* FOOTER INFO KECIL */}
            <div className="bg-[#125d72]/5 px-5 py-2 border-t border-slate-100 flex items-center gap-2">
                <Info className="h-3 w-3 text-[#125d72] opacity-40" />
                <p className="text-[8px] font-bold text-[#125d72]/60 uppercase tracking-tight">
                    Lokasi dan waktu akan diproses otomatis ke dalam header risalah rapat.
                </p>
            </div>
        </Card>
    )
}