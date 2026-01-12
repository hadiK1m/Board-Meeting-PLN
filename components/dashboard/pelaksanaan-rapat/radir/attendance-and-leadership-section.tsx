"use client"

import React, { useEffect } from "react"
import {
    Users,
    UserCheck,
    ShieldCheck,
    Users2,
    UserCircle,
    Trash2,
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

interface AttendanceAndLeadershipSectionProps {
    attendance: Record<string, AttendanceRecord>
    setAttendance: (val: Record<string, AttendanceRecord> | ((prev: Record<string, AttendanceRecord>) => Record<string, AttendanceRecord>)) => void
    guests: Guest[]
    setGuests: (val: Guest[] | ((prev: Guest[]) => Guest[])) => void
    selectedPimpinan: MultiValue<Option>
    setSelectedPimpinan: (val: MultiValue<Option> | ((prev: MultiValue<Option>) => MultiValue<Option>)) => void
}

export function AttendanceAndLeadershipSection({
    attendance,
    setAttendance,
    guests,
    setGuests,
    selectedPimpinan,
    setSelectedPimpinan,
}: AttendanceAndLeadershipSectionProps) {
    const dirOptions = DIREKTURE_PEMRAKARSA.map((d) => ({ label: d, value: d }))

    // --- EFFECT UNTUK DEFAULT HADIR ---
    useEffect(() => {
        // Cek jika data kehadiran masih kosong atau jumlahnya belum sama dengan daftar MasterData
        const currentNames = Object.keys(attendance);
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
                            Kehadiran & Pimpinan Rapat
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black bg-emerald-50 text-emerald-600">
                        KUORUM TERPENUHI
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-5 space-y-8">
                {/* 1. PIMPINAN RAPAT (Global) */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-[#125d72]" />
                        <h4 className="text-sm font-bold text-[#125d72]">Pimpinan Risalah</h4>
                    </div>
                    <Select
                        isMulti
                        options={dirOptions}
                        placeholder="Pilih pimpinan rapat..."
                        className="text-xs"
                        value={selectedPimpinan}
                        onChange={setSelectedPimpinan}
                        styles={{
                            control: (base) => ({
                                ...base,
                                borderRadius: "8px",
                                borderColor: "#e2e8f0",
                                minHeight: "38px",
                            }),
                        }}
                    />
                    <p className="text-[9px] text-slate-500 italic">
                        Pimpinan yang dipilih akan tercantum sebagai penandatangan risalah.
                    </p>
                </div>

                {/* 2. PRESENSI DIREKSI */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm font-bold text-[#125d72]">Presensi Direksi</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {DIREKTURE_PEMRAKARSA.map((name) => (
                            <div
                                key={name}
                                className={`p-4 rounded-xl border transition-all ${attendance[name]?.status === "Hadir"
                                    ? "bg-emerald-50/30 border-emerald-200"
                                    : "bg-amber-50/30 border-amber-200"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${attendance[name]?.status === "Hadir"
                                            ? "bg-emerald-500"
                                            : "bg-amber-500"
                                            }`}
                                    >
                                        {name.charAt(0)}
                                    </div>

                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">{name}</p>

                                        <select
                                            className="mt-2 w-full h-9 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:ring-[#125d72]"
                                            value={attendance[name]?.status || "Hadir"}
                                            onChange={(e) => handleStatusChange(name, e.target.value)}
                                        >
                                            <option value="Hadir">Hadir</option>
                                            <option value="Kuasa">Kuasa</option>
                                        </select>

                                        {attendance[name]?.status === "Kuasa" && (
                                            <Select
                                                isMulti
                                                options={dirOptions.filter((o) => o.value !== name)}
                                                placeholder="Pilih penerima kuasa..."
                                                className="mt-2 text-xs"
                                                value={attendance[name]?.proxy}
                                                onChange={(val) => handleFieldChange(name, "proxy", val)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. PESERTA TAMBAHAN */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users2 className="h-4 w-4 text-[#125d72]" />
                            <h4 className="text-sm font-bold text-[#125d72]">Peserta Tambahan</h4>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addGuest}
                            className="text-xs"
                        >
                            Tambah Undangan
                        </Button>
                    </div>

                    {guests.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed">
                            <p className="text-xs text-slate-500">Belum ada peserta tambahan</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {guests.map((guest) => (
                                <div key={guest.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                                    <UserCircle className="h-8 w-8 text-slate-400" />
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Nama lengkap"
                                            value={guest.name}
                                            onChange={(e) => updateGuest(guest.id, "name", e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                        <Input
                                            placeholder="Jabatan / Instansi"
                                            value={guest.position}
                                            onChange={(e) => updateGuest(guest.id, "position", e.target.value)}
                                            className="mt-2 h-8 text-sm"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeGuest(guest.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>

            {/* FOOTER SUMMARY */}
            <div className="bg-slate-50/50 p-4 border-t flex items-center justify-between text-xs">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Hadir: {Object.values(attendance).filter(a => a.status === "Hadir").length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Kuasa: {Object.values(attendance).filter(a => a.status === "Kuasa").length}</span>
                    </div>
                </div>
                <Badge variant="outline" className="text-xs">
                    {guests.length} Peserta Tambahan
                </Badge>
            </div>
        </Card>
    )
}