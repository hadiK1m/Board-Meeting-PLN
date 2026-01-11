/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useEffect } from "react"
import {
    Users,
    UserCheck,
    ShieldCheck,
    Users2,
    UserCircle,
    Trash2,
    Info,
    CheckCircle2,
    XCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Select, { MultiValue, StylesConfig } from "react-select"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"
import { cn } from "@/lib/utils"

// --- DEFINISI INTERFACE (Anti-Any) ---
export interface Option {
    label: string
    value: string
}

export interface AttendanceRecord {
    status: string
    reason?: string
    proxy?: MultiValue<Option>
}

export interface Guest {
    id: number
    name: string
    position: string
}

interface AttendanceAndLeadershipSectionProps {
    attendance: Record<string, AttendanceRecord>
    setAttendance: React.Dispatch<React.SetStateAction<Record<string, AttendanceRecord>>>
    guests: Guest[]
    setGuests: React.Dispatch<React.SetStateAction<Guest[]>>
    selectedPimpinan: MultiValue<Option>
    setSelectedPimpinan: (val: MultiValue<Option>) => void
}

export function AttendanceAndLeadershipSection({
    attendance,
    setAttendance,
    guests,
    setGuests,
    selectedPimpinan,
    setSelectedPimpinan,
}: AttendanceAndLeadershipSectionProps) {

    // Opsi Direktur dari Master Data
    const dirOptions: Option[] = DIREKTURE_PEMRAKARSA.map((name) => ({
        label: name,
        value: name
    }))

    // Inisialisasi: Jika data kosong, set semua Direksi ke status "Hadir"
    useEffect(() => {
        const currentNames = Object.keys(attendance || {});
        if (currentNames.length === 0) {
            const defaultAttendance: Record<string, AttendanceRecord> = {};
            DIREKTURE_PEMRAKARSA.forEach((name) => {
                defaultAttendance[name] = { status: "Hadir", reason: "", proxy: [] };
            });
            setAttendance(defaultAttendance);
        }
    }, [attendance, setAttendance]);

    // Handler Perubahan Status
    const handleStatusChange = (name: string, status: string) => {
        setAttendance((prev) => ({
            ...prev,
            [name]: { ...prev[name], status, reason: "", proxy: [] },
        }))
    }

    // Handler Perubahan Field (Reason/Proxy) secara aman
    const updateAttendanceField = (
        name: string,
        field: keyof AttendanceRecord,
        value: string | MultiValue<Option>
    ) => {
        setAttendance((prev) => ({
            ...prev,
            [name]: { ...prev[name], [field]: value },
        }))
    }

    // Styling React Select (Warna Teal Rakordir)
    const customSelectStyles: StylesConfig<Option, true> = {
        control: (base) => ({
            ...base,
            borderRadius: "12px",
            borderColor: "#e2e8f0",
            fontSize: "12px",
            fontWeight: "600",
            minHeight: "42px",
            boxShadow: "none",
            "&:hover": { borderColor: "#14a2ba" }
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: "#125d72",
            borderRadius: "6px",
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "white",
            fontSize: "10px",
            padding: "2px 8px"
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "white",
            "&:hover": { backgroundColor: "#0e4b5d", color: "white" }
        })
    }

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-visible bg-white h-auto">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#125d72] rounded-xl shadow-lg shadow-[#125d72]/20">
                        <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                            Kehadiran & Pimpinan
                        </CardTitle>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5 italic uppercase">
                            Verifikasi kehadiran Direksi & Peserta
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] font-black px-3 py-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> KUORUM TERPENUHI
                </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-8 h-auto">
                {/* 1. SELEKSI PIMPINAN (SIGNER) */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#125d72]">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-[11px] font-black uppercase tracking-wider">Pimpinan Rapat (Signer)</h4>
                    </div>
                    <Select
                        isMulti
                        options={dirOptions}
                        styles={customSelectStyles}
                        value={selectedPimpinan}
                        onChange={(newValue: MultiValue<Option>) => setSelectedPimpinan(newValue)}
                        placeholder="Pilih direktur penandatangan..."
                        className="text-xs"
                    />
                </div>

                {/* 2. PRESENSI DIREKSI (GRID) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <UserCheck className="h-4 w-4" />
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-[#125d72]">Presensi Direksi</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto">
                        {DIREKTURE_PEMRAKARSA.map((name) => {
                            const data = attendance?.[name] || { status: "Hadir" };
                            return (
                                <div
                                    key={name}
                                    className={cn(
                                        "p-4 rounded-2xl border transition-all h-auto",
                                        data.status === "Hadir" ? "bg-emerald-50/20 border-emerald-100" :
                                            data.status === "Tidak Hadir" ? "bg-red-50/20 border-red-100" :
                                                "bg-amber-50/20 border-amber-100"
                                    )}
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-800 uppercase truncate pr-2">{name}</span>
                                            <select
                                                className="h-8 rounded-lg border border-slate-200 bg-white text-[9px] font-black uppercase px-2 outline-none focus:ring-1 focus:ring-[#125d72]"
                                                value={data.status}
                                                onChange={(e) => handleStatusChange(name, e.target.value)}
                                            >
                                                <option value="Hadir">HADIR</option>
                                                <option value="Tidak Hadir">TIDAK HADIR</option>
                                                <option value="Kuasa">KUASA</option>
                                            </select>
                                        </div>

                                        {data.status === "Tidak Hadir" && (
                                            <Input
                                                placeholder="Berikan alasan ketidakhadiran..."
                                                className="h-9 text-[10px] font-bold bg-white rounded-xl border-red-100"
                                                value={data.reason || ""}
                                                onChange={(e) => updateAttendanceField(name, "reason", e.target.value)}
                                            />
                                        )}

                                        {data.status === "Kuasa" && (
                                            <Select
                                                isMulti
                                                options={dirOptions.filter(o => o.value !== name)}
                                                styles={customSelectStyles}
                                                value={data.proxy}
                                                onChange={(val: MultiValue<Option>) => updateAttendanceField(name, "proxy", val)}
                                                placeholder="Pilih Penerima Kuasa..."
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. PESERTA TAMU (DYNAMIC LIST) */}
                <div className="space-y-4 pt-4 border-t border-slate-100 h-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#125d72]">
                            <Users2 className="h-4 w-4" />
                            <h4 className="text-[11px] font-black uppercase tracking-wider">Peserta Tambahan / Tamu</h4>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGuests(prev => [...prev, { id: Date.now(), name: "", position: "" }])}
                            className="h-8 text-[9px] font-black uppercase border-[#125d72] text-[#125d72] hover:bg-[#125d72]/5 rounded-xl"
                        >
                            + Tambah Peserta
                        </Button>
                    </div>

                    <div className="space-y-3 h-auto">
                        {guests.map((guest) => (
                            <div key={guest.id} className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-xl group animate-in fade-in slide-in-from-top-1 duration-200 h-auto">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Nama Lengkap"
                                        value={guest.name}
                                        onChange={(e) => setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, name: e.target.value } : g))}
                                        className="h-8 text-[10px] font-bold bg-white"
                                    />
                                    <Input
                                        placeholder="Jabatan"
                                        value={guest.position}
                                        onChange={(e) => setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, position: e.target.value } : g))}
                                        className="h-8 text-[10px] font-bold bg-white"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setGuests(prev => prev.filter(g => g.id !== guest.id))}
                                    className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>

            <div className="bg-slate-50/80 p-4 border-t flex items-center gap-3 shrink-0">
                <Info className="h-4 w-4 text-[#14a2ba]" />
                <p className="text-[9px] font-bold text-slate-400 uppercase italic tracking-tighter">
                    Status kehadiran akan memengaruhi lembar daftar hadir pada draf risalah Rakordir final.
                </p>
            </div>
        </Card>
    )
}