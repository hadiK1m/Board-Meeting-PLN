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
    Building2,
    Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ✅ FIX: Definisikan tipe data yang spesifik menggantikan 'any'
interface AgendaDetail {
    id: string
    title: string
    urgency: string
    priority?: string | null
    notRequiredFiles?: string[] | null
    director?: string | null
    initiator?: string | null
    support?: string | null
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
            {/* ✅ FIX: Gunakan canonical class 'sm:max-w-125' menggantikan arbitrary value */}
            <SheetContent className="sm:max-w-125 p-0 border-none shadow-2xl">
                <SheetHeader className="p-6 bg-[#125d72] text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn(
                            "uppercase font-black text-[10px]",
                            agenda.priority === 'High' ? "bg-red-500 text-white" : "bg-[#efe62f] text-[#125d72]"
                        )}>
                            {agenda.priority || "Normal"} Priority
                        </Badge>
                    </div>
                    <SheetTitle className="text-white text-xl leading-tight">Detail Usulan Agenda</SheetTitle>
                    <SheetDescription className="text-blue-100 italic">
                        ID: {agenda.id.substring(0, 8)}... | Rakordir
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-140px)]">
                    <div className="p-6 space-y-8">
                        {/* Judul & Urgensi */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-[#125d72] text-lg leading-snug">{agenda.title}</h3>
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-xs uppercase">
                                    <Info className="h-4 w-4" /> Urgensi Pembahasan
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{agenda.urgency}</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Struktur Pemrakarsa */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[#14a2ba] font-bold text-xs uppercase tracking-wider">
                                <Building2 className="h-4 w-4" /> Struktur Pemrakarsa
                            </div>
                            <div className="grid gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Direktur Pemrakarsa</p>
                                    <p className="text-sm font-semibold text-slate-700">{agenda.director || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Divisi Pemrakarsa</p>
                                    <p className="text-sm font-semibold text-slate-700">{agenda.initiator || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Divisi Support</p>
                                    <p className="text-sm font-semibold text-slate-700">{agenda.support || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}