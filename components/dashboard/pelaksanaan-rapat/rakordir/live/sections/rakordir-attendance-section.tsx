/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useEffect } from "react"
import {
    Users,
    UserCheck,
    AlertCircle,
    UserCircle2,
    ShieldCheck,
    ChevronRight,
    Users2,
    UserCircle,
    Trash2,
    XCircle,
    Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Select, { MultiValue } from "react-select"
import { DIREKTURE_PEMRAKARSA } from "@/lib/MasterData"

// --- INTERFACES ---
interface Option {
    label: string
    value: string
}

interface AttendanceRecord {
    status: string
    reason?: string
    proxy?: readonly Option[]
}

interface Guest {
    id: number
    name: string
    position: string
}

interface RakordirAttendanceSectionProps {
    attendance: Record<string, AttendanceRecord>
    setAttendance: (val: Record<string, AttendanceRecord> | ((prev: Record<string, AttendanceRecord>) => Record<string, AttendanceRecord>)) => void
    guests: Guest[]
    setGuests: (val: Guest[] | ((prev: Guest[]) => Guest[])) => void
    selectedPimpinan: MultiValue<Option>
    setSelectedPimpinan: (val: MultiValue<Option> | ((prev: MultiValue<Option>) => MultiValue<Option>)) => void
}

export function RakordirAttendanceSection({
    attendance,
    setAttendance,
    guests,
    setGuests,
    selectedPimpinan,
    setSelectedPimpinan,
}: RakordirAttendanceSectionProps) {

    const dirOptions = DIREKTURE_PEMRAKARSA.map((name) => ({ label: name, value: name }))

    // --- EFFECT UNTUK DEFAULT HADIR (LOGIKA DARI REFERENSI) ---
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

    const handleStatusChange = (name: string, status: string) => {
        setAttendance((prev) => ({
            ...prev,
            [name]: { ...prev[name], status, reason: "", proxy: [] },
        }))
    }

    const handleFieldChange = (name: string, field: string, value: string | MultiValue<Option> | null) => {
        setAttendance((prev) => ({
            ...prev,
            [name]: { ...prev[name], [field]: value },
        }))
    }

    const addGuest = () => {
        setGuests((prev) => [...prev, { id: Date.now(), name: "", position: "" }])
    }

    const removeGuest = (id: number) => {
        setGuests((prev) => prev.filter((g) => g.id !== id))
    }

    const updateGuest = (id: number, field: keyof Guest, value: string) => {
        setGuests((prev) =>
            prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
        )
    }

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#125d72]/10 rounded-lg">
                            <Users className="h-4 w-4 text-[#125d72]" />
                        </div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                            KEHADIRAN & PIMPINAN RAKORDIR
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black bg-emerald-50 text-emerald-600 border-emerald-200">
                        KUORUM TERPENUHI
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-5 space-y-8">
                {/* 1. PIMPINAN RAPAT (Signer Dokumen) */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#125d72]" />
                        <h4 className="text-sm font-bold text-[#125d72]">Pimpinan Notulensi</h4>
                    </div>
                    <Select
                        isMulti
                        options={dirOptions}
                        placeholder="Pilih direktur penandatangan..."
                        className="text-xs font-bold"
                        value={selectedPimpinan}
                        onChange={setSelectedPimpinan}
                        styles={{
                            control: (base) => ({
                                ...base,
                                borderRadius: "10px",
                                borderColor: "#e2e8f0",
                                minHeight: "42px",
                                fontWeight: "bold"
                            }),
                        }}
                    />
                </div>

                {/* 2. PRESENSI DIREKSI (Grid UX Referensi) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm font-bold text-[#125d72]">Presensi Direksi</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {DIREKTURE_PEMRAKARSA.map((name) => (
                            <div
                                key={name}
                                className={`p-4 rounded-xl border transition-all ${attendance?.[name]?.status === "Hadir"
                                        ? "bg-emerald-50/30 border-emerald-200"
                                        : attendance?.[name]?.status === "Tidak Hadir"
                                            ? "bg-red-50/30 border-red-200"
                                            : "bg-amber-50/30 border-amber-200"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md ${attendance?.[name]?.status === "Hadir" ? "bg-emerald-500" :
                                            attendance?.[name]?.status === "Tidak Hadir" ? "bg-red-500" : "bg-amber-500"
                                        }`}>
                                        {name.substring(0, 3).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-800 uppercase truncate">{name}</p>

                                        <select
                                            className="mt-2 w-full h-9 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase focus:ring-[#125d72] transition-all"
                                            value={attendance?.[name]?.status || "Hadir"}
                                            onChange={(e) => handleStatusChange(name, e.target.value)}
                                        >
                                            <option value="Hadir">HADIR</option>
                                            <option value="Tidak Hadir">TIDAK HADIR</option>
                                            <option value="Kuasa">KUASA</option>
                                        </select>

                                        {attendance?.[name]?.status === "Tidak Hadir" && (
                                            <Input
                                                placeholder="Alasan berhalangan..."
                                                className="mt-2 h-8 text-[10px] font-bold border-red-100 focus:ring-red-500"
                                                value={attendance?.[name]?.reason || ""}
                                                onChange={(e) => handleFieldChange(name, "reason", e.target.value)}
                                            />
                                        )}

                                        {attendance?.[name]?.status === "Kuasa" && (
                                            <Select
                                                isMulti
                                                options={dirOptions.filter((o) => o.value !== name)}
                                                placeholder="Pilih penerima kuasa..."
                                                className="mt-2 text-[10px] font-bold"
                                                value={attendance?.[name]?.proxy as MultiValue<Option>}
                                                onChange={(val) => handleFieldChange(name, "proxy", val)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. PESERTA TAMU (Dynamic List) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users2 className="h-4 w-4 text-[#125d72]" />
                            <h4 className="text-sm font-bold text-[#125d72]">Peserta Tambahan / Tamu</h4>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addGuest}
                            className="h-8 text-[10px] font-black uppercase border-[#125d72] text-[#125d72] hover:bg-[#125d72]/10"
                        >
                            + Tambah Undangan
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {guests.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase italic">Belum ada peserta tambahan</p>
                            </div>
                        ) : (
                            guests.map((guest) => (
                                <div key={guest.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-1">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <UserCircle className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <Input
                                            placeholder="Nama Lengkap"
                                            value={guest.name}
                                            onChange={(e) => updateGuest(guest.id, "name", e.target.value)}
                                            className="h-8 text-[10px] font-bold"
                                        />
                                        <Input
                                            placeholder="Jabatan / Instansi"
                                            value={guest.position}
                                            onChange={(e) => updateGuest(guest.id, "position", e.target.value)}
                                            className="h-8 text-[10px] font-bold"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeGuest(guest.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>

            {/* FOOTER SUMMARY (Sesuai Referensi) */}
            <div className="bg-slate-50/80 p-4 border-t flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>HADIR: {Object.values(attendance || {}).filter(a => a.status === "Hadir").length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>KUASA: {Object.values(attendance || {}).filter(a => a.status === "Kuasa").length}</span>
                    </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-black bg-white border-slate-200 text-[#125d72] px-3">
                    {guests.length} PESERTA TAMU
                </Badge>
            </div>
        </Card>
    )
}