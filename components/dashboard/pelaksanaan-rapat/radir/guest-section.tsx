"use client"

import React from "react"
import {
    UserPlus,
    Trash2,
    Plus,
    UserCircle,
    Briefcase,
    Users2,
    MinusCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Guest {
    id: number;
    name: string;
    position: string;
}

interface GuestSectionProps {
    guests: Guest[];
    setGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
}

export function GuestSection({ guests, setGuests }: GuestSectionProps) {

    const addGuest = () => {
        setGuests([...guests, { id: Date.now(), name: "", position: "" }]);
    };

    const removeGuest = (id: number) => {
        setGuests(guests.filter((g) => g.id !== id));
    };

    const updateGuest = (id: number, field: keyof Guest, value: string) => {
        setGuests(
            guests.map((g) => (g.id === id ? { ...g, [field]: value } : g))
        );
    };

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#14a2ba]/10 rounded-lg">
                        <Users2 className="h-4 w-4 text-[#125d72]" />
                    </div>
                    <div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                            Peserta Tambahan
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">Manajemen Atas & Undangan</p>
                    </div>
                </div>
                <Button
                    onClick={addGuest}
                    variant="outline"
                    size="sm"
                    className="h-7 border-[#14a2ba] text-[#14a2ba] hover:bg-cyan-50 text-[9px] font-black uppercase px-3 rounded-full"
                >
                    <Plus className="h-3 w-3 mr-1" /> Tambah
                </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
                {guests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                        <UserPlus className="h-8 w-8 text-slate-200 mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                            Belum ada undangan tambahan.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {guests.map((guest, index) => (
                            <div
                                key={guest.id}
                                className="group relative p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-[#14a2ba]/30 hover:shadow-md transition-all animate-in slide-in-from-right-2"
                            >
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Input Nama */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <UserCircle className="h-3 w-3 text-[#14a2ba] opacity-50" />
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Nama Lengkap</span>
                                        </div>
                                        <Input
                                            placeholder="Masukkan nama..."
                                            className="h-9 text-xs font-bold border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-[#14a2ba] rounded-lg"
                                            value={guest.name}
                                            onChange={(e) => updateGuest(guest.id, "name", e.target.value)}
                                        />
                                    </div>

                                    {/* Input Jabatan */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-3 w-3 text-slate-300" />
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Jabatan / Satuan</span>
                                        </div>
                                        <Input
                                            placeholder="Masukkan jabatan..."
                                            className="h-9 text-xs italic border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-[#14a2ba] rounded-lg"
                                            value={guest.position}
                                            onChange={(e) => updateGuest(guest.id, "position", e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Floating Delete Button */}
                                <button
                                    onClick={() => removeGuest(guest.id)}
                                    className="absolute -top-2 -right-2 h-6 w-6 bg-white border border-red-100 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MinusCircle className="h-4 w-4" />
                                </button>

                                {/* Nomor Urut */}
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-5 bg-slate-100 text-slate-400 text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <div className="bg-slate-50/50 p-3 px-5 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[8px] text-slate-400 font-bold uppercase">Undangan Terdaftar</p>
                <Badge variant="outline" className="text-[9px] font-black text-[#125d72] bg-white border-slate-200">
                    {guests.length} ORANG
                </Badge>
            </div>
        </Card>
    );
}