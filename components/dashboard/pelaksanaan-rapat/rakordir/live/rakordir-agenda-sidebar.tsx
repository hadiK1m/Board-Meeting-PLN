"use client"

import React from "react"
import {
    CheckCircle2,
    ChevronRight,
    LayoutList,
    Layers
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Agenda } from "@/db/schema/agendas"

interface RakordirAgendaSidebarProps {
    agendas: Agenda[]
    activeAgendaId: string
    onSelectAgenda: (id: string) => void
    completedStatus: Record<string, boolean>
    meetingNumber?: string
}

export function RakordirAgendaSidebar({
    agendas,
    activeAgendaId,
    onSelectAgenda,
    completedStatus,
    meetingNumber
}: RakordirAgendaSidebarProps) {
    return (
        <aside className="hidden w-80 flex-col border-r bg-white md:flex overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
            {/* Header Sidebar */}
            <div className="p-6 border-b shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-[#125d72] rounded-xl shadow-lg shadow-[#125d72]/20">
                        <Layers className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-[#14a2ba] uppercase tracking-[0.2em] leading-none mb-1">
                            Sesi Rakordir
                        </span>
                        <h1 className="text-xs font-black text-[#125d72] uppercase truncate">
                            ID: #{meetingNumber || "UNSPECIFIED"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                        <LayoutList className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            Total Materi
                        </span>
                    </div>
                    <Badge variant="outline" className="h-5 px-2 bg-slate-50 text-[10px] font-black border-slate-200">
                        {agendas.length}
                    </Badge>
                </div>
            </div>

            {/* List Agenda */}
            <ScrollArea className="flex-1 px-4 py-6 bg-white">
                <div className="space-y-2.5 pb-20">
                    {agendas.map((item, index) => {
                        const isActive = activeAgendaId === item.id
                        const isDone = completedStatus[item.id]

                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelectAgenda(item.id)}
                                className={cn(
                                    "w-full group flex items-start gap-3.5 p-4 rounded-2xl transition-all duration-300 text-left border relative",
                                    isActive
                                        ? "bg-[#125d72] border-[#125d72] text-white shadow-xl shadow-[#125d72]/20 translate-x-1"
                                        : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-600"
                                )}
                            >
                                {/* Indicator Dot (Hanya Aktif) */}
                                {isActive && (
                                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-[#14a2ba] rounded-full" />
                                )}

                                {/* Number / Status Icon */}
                                <div className={cn(
                                    "mt-0.5 flex items-center justify-center min-w-7 h-7 rounded-xl text-[10px] font-black shrink-0 transition-colors",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : isDone
                                            ? "bg-emerald-100 text-emerald-600"
                                            : "bg-slate-100 text-slate-400"
                                )}>
                                    {isDone ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (
                                        <span>{(index + 1).toString().padStart(2, '0')}</span>
                                    )}
                                </div>

                                {/* Text Content */}
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className={cn(
                                        "text-[10px] font-black leading-snug uppercase tracking-tight line-clamp-2",
                                        isActive ? "text-white" : "text-slate-800"
                                    )}>
                                        {item.title}
                                    </h3>

                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className={cn(
                                            "h-1 w-8 rounded-full",
                                            isActive ? "bg-white/30" : "bg-slate-100"
                                        )}>
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    isDone ? "bg-emerald-400 w-full" : "bg-[#14a2ba] w-1/3"
                                                )}
                                            />
                                        </div>
                                        <span className={cn(
                                            "text-[8px] font-bold uppercase italic",
                                            isActive ? "text-white/60" : "text-slate-400"
                                        )}>
                                            {isDone ? "Lengkap" : "Draf"}
                                        </span>
                                    </div>
                                </div>

                                {/* Chevron (Hanya Desktop Hover) */}
                                {!isActive && (
                                    <ChevronRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </ScrollArea>

            {/* Footer Sidebar (Optional Info) */}
            <div className="p-4 bg-slate-50/50 border-t mt-auto">
                <div className="flex items-center gap-2 px-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Real-time Sync Active
                    </span>
                </div>
            </div>
        </aside>
    )
}