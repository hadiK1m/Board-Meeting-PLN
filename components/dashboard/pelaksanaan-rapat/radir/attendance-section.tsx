"use client"

import React from "react"
import {
    Users,
    ChevronRight,
    UserCheck,
    AlertCircle,
    UserCircle2,
    ShieldCheck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Select, { MultiValue } from "react-select"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"

// --- INTERFACES ---
interface Option {
    label: string;
    value: string;
}

interface AttendanceRecord {
    status: string;
    reason?: string;
    proxy?: readonly Option[];
}

interface AttendanceSectionProps {
    attendance: Record<string, AttendanceRecord>;
    setAttendance: React.Dispatch<React.SetStateAction<Record<string, AttendanceRecord>>>;
}

export function AttendanceSection({ attendance, setAttendance }: AttendanceSectionProps) {

    const dirOptions = DIREKTURE_PEMRAKARSA.map(d => ({ label: d, value: d }));

    const handleStatusChange = (name: string, status: string) => {
        setAttendance(prev => ({
            ...prev,
            [name]: { ...prev[name], status, reason: "", proxy: [] }
        }));
    };

    const handleFieldChange = (name: string, field: string, value: string | MultiValue<Option> | null) => {
        setAttendance(prev => ({
            ...prev,
            [name]: { ...prev[name], [field]: value }
        }));
    };

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[#125d72]/10 rounded-lg">
                            <Users className="h-4 w-4 text-[#125d72]" />
                        </div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                            Presensi Direksi
                        </CardTitle>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 opacity-50">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Validasi Kuorum</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4">
                {/* GRID UTAMA: 50/50 pada layar medium ke atas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DIREKTURE_PEMRAKARSA.map((name) => (
                        <div
                            key={name}
                            className={`flex flex-col p-4 rounded-xl border transition-all duration-300 ${attendance[name]?.status === "Hadir" ? "bg-emerald-50/20 border-emerald-100/50" :
                                attendance[name]?.status === "Tidak Hadir" ? "bg-red-50/20 border-red-100/50" :
                                    "bg-amber-50/20 border-amber-100/50"
                                }`}
                        >
                            {/* KONTEN UTAMA: SEJAJAR KE ATAS (ITEMS-START) */}
                            <div className="flex items-start gap-3 w-full">

                                {/* AVATAR + STATUS: BERJEJER KE BAWAH & SAMA BESAR */}
                                <div className="flex flex-col items-center gap-2 shrink-0">

                                    {/* 2. BULATAN STATUS (UKURAN SAMA BESAR DENGAN DI ATAS) */}
                                    <div className={`h-10 w-10 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-colors duration-300 ${attendance[name]?.status === "Hadir" ? "bg-emerald-500" :
                                        attendance[name]?.status === "Tidak Hadir" ? "bg-red-500" : "bg-amber-500"
                                        }`}>
                                        {attendance[name]?.status === "Hadir" ? (
                                            <UserCheck className="h-5 w-5 text-white stroke-[3px]" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-white stroke-[3px]" />
                                        )}
                                    </div>
                                </div>

                                {/* 2. AREA INPUT (NAMA, DROPDOWN, TEXTAREA) */}
                                <div className="flex-1 min-w-0 space-y-2">
                                    <p className="text-[10px] font-black text-[#125d72] uppercase truncate tracking-tight leading-none">
                                        {name}
                                    </p>

                                    {/* DROPDOWN & INPUT DETAIL SEJAJAR KE ATAS */}
                                    <div className="flex flex-col xl:flex-row items-start gap-2">
                                        {/* Dropdown Status */}
                                        <div className="relative w-full xl:w-32 shrink-0">
                                            <select
                                                className="w-full h-9 pl-2 pr-7 rounded-lg border border-slate-200 bg-white text-[9px] font-bold text-[#125d72] uppercase appearance-none focus:ring-1 focus:ring-[#14a2ba] outline-none cursor-pointer shadow-sm"
                                                value={attendance[name]?.status || "Hadir"}
                                                onChange={(e) => handleStatusChange(name, e.target.value)}
                                            >
                                                <option value="Hadir">HADIR</option>
                                                <option value="Tidak Hadir">ABSEN</option>
                                                <option value="Kuasa">KUASA</option>
                                            </select>
                                            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 rotate-90 pointer-events-none" />
                                        </div>

                                        {/* Dinamis Input (Textarea / MultiSelect / Confirmation) */}
                                        <div className="flex-1 w-full">
                                            {attendance[name]?.status === "Tidak Hadir" && (
                                                <textarea
                                                    placeholder="Tuliskan alasan absen..."
                                                    className="w-full min-h-[60px] p-2 text-[10px] bg-white border border-red-100 rounded-lg focus:ring-1 focus:ring-red-400 outline-none resize-none font-medium text-slate-700 italic shadow-inner"
                                                    value={attendance[name]?.reason || ""}
                                                    onChange={(e) => handleFieldChange(name, "reason", e.target.value)}
                                                />
                                            )}

                                            {attendance[name]?.status === "Kuasa" && (
                                                <Select
                                                    isMulti
                                                    options={dirOptions.filter(o => o.value !== name)}
                                                    placeholder="Pilih Penerima..."
                                                    className="shadow-sm"
                                                    styles={{
                                                        control: (base) => ({
                                                            ...base,
                                                            minHeight: '36px',
                                                            borderRadius: '8px',
                                                            fontSize: '9px',
                                                            borderColor: '#fde68a',
                                                            backgroundColor: 'white'
                                                        })
                                                    }}
                                                    value={attendance[name]?.proxy as MultiValue<Option>}
                                                    onChange={(val) => handleFieldChange(name, "proxy", val)}
                                                />
                                            )}

                                            {attendance[name]?.status === "Hadir" && (
                                                <div className="flex items-center gap-2 px-2.5 py-2 bg-white/60 rounded-lg border border-emerald-100/50 w-fit shadow-sm">
                                                    <UserCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                    <span className="text-[9px] font-black uppercase tracking-tight text-emerald-700 leading-none">
                                                        Konfirmasi Hadir
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            <div className="bg-slate-50/50 p-3 px-5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase">
                            {Object.values(attendance).filter(a => a.status === "Hadir").length} Hadir
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase">
                            {Object.values(attendance).filter(a => a.status === "Kuasa").length} Kuasa
                        </span>
                    </div>
                </div>
                <p className="text-[8px] text-slate-400 font-bold italic uppercase tracking-widest">
                    * Verifikasi Daftar Hadir Otomatis
                </p>
            </div>
        </Card>
    );
}