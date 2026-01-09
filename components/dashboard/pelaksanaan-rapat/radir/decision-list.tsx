"use client"

import React from "react"
import {
    Gavel,
    Plus,
    Trash2,
    ChevronRight,
    CheckCircle2,
    MessageSquare
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DecisionItem {
    id: number;
    text: string;
}

interface DecisionListProps {
    decisions: DecisionItem[];
    setDecisions: React.Dispatch<React.SetStateAction<DecisionItem[]>>;
}

export function DecisionList({ decisions, setDecisions }: DecisionListProps) {

    const addDecision = () => {
        setDecisions([...decisions, { id: Date.now(), text: "" }]);
    };

    const removeDecision = (id: number) => {
        setDecisions(decisions.filter((d) => d.id !== id));
    };

    const updateDecision = (id: number, text: string) => {
        setDecisions(
            decisions.map((d) => (d.id === id ? { ...d, text } : d))
        );
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#125d72]/10 rounded-lg">
                        <Gavel className="h-4 w-4 text-[#125d72]" />
                    </div>
                    <div>
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-[#125d72]">
                            Butir-Butir Keputusan
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-medium">Ketetapan hasil sidang yang bersifat final</p>
                    </div>
                </div>
                <Button
                    onClick={addDecision}
                    variant="outline"
                    size="sm"
                    className="h-8 border-[#14a2ba] text-[#14a2ba] hover:bg-cyan-50 text-[10px] font-black uppercase px-4 rounded-lg shadow-sm"
                >
                    <Plus className="h-3 w-3 mr-2" /> Tambah Butir
                </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6 bg-slate-50/30">
                {decisions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                            <CheckCircle2 className="h-6 w-6 text-slate-200" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest italic">
                            Belum ada keputusan yang diinputkan.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {decisions.map((decision, index) => (
                            <div
                                key={decision.id}
                                className="relative flex flex-col sm:flex-row gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#14a2ba]/40 transition-all animate-in slide-in-from-right-4 duration-300"
                            >
                                {/* Penomoran Butir */}
                                <div className="shrink-0">
                                    <div className="h-8 w-8 rounded-lg bg-[#125d72] text-white text-[11px] font-black flex items-center justify-center shadow-lg shadow-cyan-900/20">
                                        {index + 1}
                                    </div>
                                </div>

                                {/* Area Input Keputusan */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-3 w-3 text-[#14a2ba] opacity-50" />
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Keputusan / Instruksi</label>
                                    </div>
                                    <Textarea
                                        placeholder="Tuliskan butir keputusan secara lugas dan jelas..."
                                        className="min-h-24 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-[#14a2ba] text-[13px] font-semibold leading-relaxed text-slate-700 resize-none p-4 rounded-xl shadow-inner"
                                        value={decision.text}
                                        onChange={(e) => updateDecision(decision.id, e.target.value)}
                                    />
                                </div>

                                {/* Tombol Hapus */}
                                <div className="flex sm:flex-col justify-end">
                                    <Button
                                        onClick={() => removeDecision(decision.id)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="absolute top-2 right-12 hidden sm:block">
                                    <ChevronRight className="h-3 w-3 text-slate-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <div className="bg-white p-4 px-6 border-t border-slate-100 flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-black text-[#125d72] border-[#125d72]/20 bg-[#125d72]/5 px-4 py-1">
                    TOTAL: {decisions.length} BUTIR KEPUTUSAN
                </Badge>
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter">
                        Data akan diproses menjadi draf Surat Keputusan Rapat.
                    </p>
                </div>
            </div>
        </Card>
    );
}