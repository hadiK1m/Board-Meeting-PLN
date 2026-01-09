"use client"

import React from "react"
import {
    Quote,
    AlertCircle,
    UserCheck,
    Lightbulb,
    BookOpen,
    Info,
    Scale
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Select, { MultiValue } from "react-select"

// --- INTERFACES ---
interface Option {
    label: string;
    value: string;
}

interface SidebarInfoProps {
    selectedPimpinan: MultiValue<Option>;
    setSelectedPimpinan: (val: MultiValue<Option>) => void;
    executiveSummary: string;
    setExecutiveSummary: (val: string) => void;
    considerations: string;
    setConsiderations: (val: string) => void;
    dissentingOpinion: string;
    setDissentingOpinion: (val: string) => void;
}

// Master Data Internal (Bisa disesuaikan atau dilempar via props)
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"

export function SidebarInfo({
    selectedPimpinan,
    setSelectedPimpinan,
    executiveSummary,
    setExecutiveSummary,
    considerations,
    setConsiderations,
    dissentingOpinion,
    setDissentingOpinion
}: SidebarInfoProps) {

    const dirOptions = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));

    return (
        <div className="space-y-6">

            {/* 1. SEKSI PIMPINAN RAPAT */}
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#125d72] flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-[#14a2ba]" /> Pimpinan Sidang
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-5">
                    <Select
                        isMulti
                        options={dirOptions}
                        placeholder="Cari & pilih pimpinan..."
                        className="text-xs"
                        styles={{
                            control: (base) => ({
                                ...base,
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                boxShadow: 'none',
                                '&:hover': { border: '1px solid #14a2ba' }
                            }),
                            multiValue: (base) => ({
                                ...base,
                                backgroundColor: '#f1f5f9',
                                borderRadius: '6px',
                            }),
                            multiValueLabel: (base) => ({
                                ...base,
                                fontSize: '10px',
                                fontWeight: '700',
                                color: '#125d72'
                            })
                        }}
                        value={selectedPimpinan}
                        onChange={setSelectedPimpinan}
                    />
                    <div className="mt-3 flex gap-1.5 items-start px-1">
                        <Info className="h-3 w-3 text-slate-300 mt-0.5" />
                        <p className="text-[9px] text-slate-400 font-medium italic leading-tight">
                            Pimpinan yang dipilih akan tercantum sebagai penandatangan dokumen.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. RINGKASAN & PERTIMBANGAN (WARNA GELAP UNTUK KONTRAS) */}
            <Card className="border-none shadow-lg bg-[#125d72] text-white overflow-hidden">
                <CardHeader className="py-4 border-b border-white/10 bg-black/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Quote className="h-3.5 w-3.5 text-[#efe62f]" /> Intisari Risalah
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                    <div className="space-y-2">
                        <Label className="text-[9px] uppercase font-bold text-white/50 tracking-[0.15em] flex items-center gap-2">
                            <Lightbulb className="h-3 w-3" /> Ringkasan Eksekutif
                        </Label>
                        <Textarea
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-xs min-h-25 focus-visible:ring-[#efe62f] rounded-xl resize-none leading-relaxed"
                            placeholder="Tuliskan pokok pembahasan utama..."
                            value={executiveSummary}
                            onChange={(e) => setExecutiveSummary(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] uppercase font-bold text-white/50 tracking-[0.15em] flex items-center gap-2">
                            <BookOpen className="h-3 w-3" /> Dasar Pertimbangan
                        </Label>
                        <Textarea
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-xs min-h-25 focus-visible:ring-[#efe62f] rounded-xl resize-none leading-relaxed"
                            placeholder="Landasan atau regulasi terkait..."
                            value={considerations}
                            onChange={(e) => setConsiderations(e.target.value)}
                        />
                    </div>
                </CardContent>
                <div className="bg-black/20 py-2 px-5">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest text-center italic">
                        Bagian ini akan muncul di halaman pertama risalah.
                    </p>
                </div>
            </Card>

            {/* 3. DISSENTING OPINION (HIGHLIGHT WARNA ORANGE) */}
            <Card className="border-none shadow-sm border-l-4 border-l-orange-500 bg-orange-50/30">
                <CardHeader className="py-3">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-orange-700 flex items-center gap-2">
                        <Scale className="h-3.5 w-3.5" /> Dissenting Opinion
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                    <Textarea
                        placeholder="Catat jika terdapat anggota direksi yang memiliki pendapat berbeda..."
                        className="text-xs min-h-25 bg-white border-orange-100 focus-visible:ring-orange-500 rounded-xl shadow-inner italic text-orange-900"
                        value={dissentingOpinion}
                        onChange={(e) => setDissentingOpinion(e.target.value)}
                    />
                    <div className="mt-3 flex items-start gap-2 bg-orange-100/50 p-2 rounded-lg border border-orange-200/50">
                        <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 shrink-0" />
                        <p className="text-[9px] text-orange-800 font-medium italic leading-tight">
                            Dissenting opinion bersifat opsional, isi hanya jika terjadi ketidaksepakatan dalam rapat.
                        </p>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}