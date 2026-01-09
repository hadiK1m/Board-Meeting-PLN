import React from "react"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { RadirMeetingClient } from "@/components/dashboard/pelaksanaan-rapat/radir/radir-meeting-client"
import { Button } from "@/components/ui/button"
import { ChevronLeft, FileText, Calendar } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { id as localeID } from "date-fns/locale"

interface RadirDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function RadirDetailPage({ params }: RadirDetailPageProps) {
    const { id } = await params;

    // 1. Ambil data spesifik agenda berdasarkan ID
    const currentAgenda = await db.query.agendas.findFirst({
        where: eq(agendas.id, id)
    });

    // 2. Jika agenda tidak ditemukan, tampilkan 404
    if (!currentAgenda) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
            {/* HEADER & NAVIGASI BALIK */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/pelaksanaan-rapat/radir">
                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-200 bg-white shadow-sm hover:bg-slate-100 transition-all">
                            <ChevronLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <FileText className="h-2.5 w-2.5 text-[#14a2ba]" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Input Risalah Sidang
                            </span>
                        </div>
                        {/* Ukuran teks diturunkan dan line-clamp dihapus agar teks membungkus ke bawah jika sangat panjang */}
                        <h2 className="text-sm md:text-base font-black leading-tight text-[#125d72] uppercase max-w-2xl">
                            {currentAgenda.title}
                        </h2>
                    </div>
                </div>

                {/* INFO STATUS DI HEADER - MINIMALIST VERSION */}
                <div className="flex items-center gap-3 bg-white/50 px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-[#14a2ba]" />
                    <div className="flex flex-col leading-tight">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Target Pelaksanaan</span>
                        <span className="text-[10px] font-bold text-[#125d72]">
                            {currentAgenda.executionDate ? format(new Date(currentAgenda.executionDate), "dd MMM yyyy", { locale: localeID }) : "BELUM DIATUR"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto">
                <hr className="border-slate-200/60 my-4" />
            </div>

            {/* KOMPONEN INPUT UTAMA */}
            {/* Perbaikan: Mengirim prop sebagai currentAgenda (bukan initialAgendas) */}
            <RadirMeetingClient currentAgenda={currentAgenda} />
        </div>
    )
}