// components/dashboard/pelaksanaan-rapat/radir/dissenting-opinion-section.tsx
"use client"

import React from "react"
import { AlertCircle, Scale, CheckCircle2, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DissentingOpinionSectionProps {
    value: string
    onChange: (value: string) => void
}

export function DissentingOpinionSection({ value, onChange }: DissentingOpinionSectionProps) {
    const handleSetNoDissent = () => {
        onChange("Tidak ada")
    }

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-200">
            <CardHeader className="bg-orange-50/30 border-b border-orange-100 py-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100/50 rounded-lg">
                        <Scale className="h-5 w-5 text-orange-700" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-black uppercase tracking-widest text-orange-700">
                            Pendapat Berbeda (Dissenting Opinion)
                        </CardTitle>
                        <p className="text-xs text-orange-600 mt-1 italic">
                            Catatan ketidaksepakatan (jika ada)
                        </p>
                    </div>
                </div>
                <Badge
                    variant="outline"
                    className="text-[9px] font-black bg-orange-50 text-orange-700 border-orange-200 uppercase"
                >
                    OPSIONAL
                </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Textarea Utama */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <label className="text-sm font-medium text-orange-800">
                            Catatan Pendapat Berbeda
                        </label>
                    </div>
                    <Textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Diisi jika terdapat anggota direksi yang memiliki pendapat berbeda...&#10;Jika tidak ada, tulis «Tidak ada»"
                        className="min-h-30 bg-orange-50/20 border-orange-200 focus-visible:ring-orange-400 focus:border-orange-300 text-orange-900 placeholder:text-orange-400/70 rounded-xl resize-y shadow-inner"
                    />
                </div>

                {/* Quick Action: Set "Tidak ada" */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSetNoDissent}
                        className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Tidak Ada Pendapat Berbeda
                    </Button>
                    <p className="text-[10px] text-orange-600 italic">
                        Klik jika tidak ada dissenting opinion dalam agenda ini
                    </p>
                </div>

                {/* Info GCG */}
                <div className="bg-orange-50/40 p-4 rounded-lg border border-orange-100 flex items-start gap-3">
                    <Info className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-orange-800 leading-relaxed">
                        Pendapat berbeda wajib dicatat sesuai prinsip Good Corporate Governance (GCG) dan transparansi.
                        Jika ada, akan menjadi bagian penting dalam lembar isi risalah dan evaluasi keputusan.
                    </p>
                </div>
            </CardContent>

            {/* FOOTER */}
            <div className="bg-orange-50/20 p-4 px-6 border-t border-orange-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="font-medium text-orange-700">
                        {value === "Tidak ada" || !value.trim() ? "Tidak Ada DO" : "Ada Pendapat Berbeda"}
                    </span>
                </div>
                <p className="text-[10px] text-orange-600 italic">
                    Catatan ini bersifat wajib jika terjadi ketidaksepakatan.
                </p>
            </div>
        </Card>
    )
}