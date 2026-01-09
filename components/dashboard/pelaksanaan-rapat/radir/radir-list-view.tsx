"use client"

import React, { useState } from "react"
import {
    Search,
    Calendar,
    ArrowRight,
    Clock,
    MapPin,
    AlertCircle,
    User
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Agenda } from "@/db/schema/agendas" // Import tipe Agenda

interface RadirListViewProps {
    initialData: Agenda[] // Mengganti any dengan Agenda[]
    viewMode: "table" | "grid"
}

export function RadirListView({ initialData, viewMode }: RadirListViewProps) {
    const [searchTerm, setSearchTerm] = useState("")

    // Filter Data berdasarkan Judul atau Nama Direktur
    const filteredData = initialData.filter((item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.director.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SELESAI_SIDANG":
                return <Badge className="bg-emerald-500 text-white border-none text-[9px] font-bold uppercase">SELESAI</Badge>
            case "DIJADWALKAN":
                return <Badge className="bg-amber-500 text-white border-none text-[9px] font-bold uppercase">SIAP SIDANG</Badge>
            default:
                return <Badge variant="outline" className="text-[9px] font-bold uppercase">{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* SEARCH BAR SECTION */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Cari agenda atau direktur..."
                    className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-[#125d72]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* CONDITIONAL VIEW RENDERING */}
            {viewMode === "table" ? (
                /* --- TABLE VIEW --- */
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Detail Agenda</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hidden md:table-cell">Jadwal & Lokasi</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-[#125d72] line-clamp-1">{item.title}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase">
                                                <User className="h-3 w-3" /> {item.director}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <div className="space-y-1 text-[11px] font-medium text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-[#14a2ba]" />
                                                {item.executionDate ? format(new Date(item.executionDate), "dd MMMM yyyy", { locale: id }) : "-"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3 text-slate-300" /> {item.meetingLocation || "Belum ditentukan"}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(item.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/pelaksanaan-rapat/radir/${item.id}`}>
                                            <Button size="sm" className="bg-[#125d72] hover:bg-[#14a2ba] rounded-lg h-8 text-[10px] font-bold uppercase tracking-wider group">
                                                {item.status === "SELESAI_SIDANG" ? "Lihat Risalah" : "Mulai Sidang"}
                                                <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* --- GRID VIEW --- */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredData.map((item) => (
                        <Card key={item.id} className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden border-t-4 border-t-[#125d72]">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="bg-slate-50 text-[9px] font-bold uppercase border-slate-200">
                                        {item.priority}
                                    </Badge>
                                    {getStatusBadge(item.status)}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black text-[#125d72] line-clamp-2 leading-snug h-10">{item.title}</h3>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase italic">
                                        <div className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black">{item.director[0]}</div>
                                        {item.director}
                                    </div>
                                </div>
                                <hr className="border-slate-100" />
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
                                    <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-[#14a2ba]" /> {item.executionDate ? format(new Date(item.executionDate), "dd MMM yy") : "-"}</div>
                                    <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-slate-300" /> {item.startTime || "--:--"}</div>
                                </div>
                                <Link href={`/pelaksanaan-rapat/radir/${item.id}`} className="block">
                                    <Button className="w-full bg-slate-100 hover:bg-[#125d72] text-[#125d72] hover:text-white border-none shadow-none text-[10px] font-black uppercase tracking-widest h-10 transition-all">
                                        {item.status === "SELESAI_SIDANG" ? "Buka Dokumentasi" : "Input Risalah"}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {filteredData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                    <AlertCircle className="h-12 w-12 text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium italic text-sm text-center">
                        Tidak ada agenda yang ditemukan untuk pencarian &quot;{searchTerm}&quot;
                    </p>
                </div>
            )}
        </div>
    )
}