/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/pelaksanaan-rapat/rakordir/live/page.tsx

import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { inArray, and, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { AlertCircle, ChevronLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import RakordirBulkMeetingClient from "@/components/dashboard/pelaksanaan-rapat/rakordir/live/rakordir-bulk-meeting-client"

export const dynamic = "force-dynamic"

interface RakordirLivePageProps {
    searchParams: Promise<{
        ids?: string
        year?: string
        number?: string
    }>
}

export default async function RakordirLivePage(props: RakordirLivePageProps) {
    // 1. Unwrapping searchParams (Wajib untuk Next.js 15+)
    const searchParams = await props.searchParams
    const { ids, year, number } = searchParams

    // 2. Proteksi Awal: Jika tidak ada parameter, kembalikan ke monitoring
    if (!ids && !number) {
        redirect("/pelaksanaan-rapat/rakordir")
    }

    let meetingAgendas: any[] = []

    try {
        // 3. Logika Fetching Data Berdasarkan Alur
        if (ids) {
            // ALUR BARU: Mengambil agenda berdasarkan ID yang dipilih dari modal
            const agendaIds = ids.split(",")
            meetingAgendas = await db.query.agendas.findMany({
                where: inArray(agendas.id, agendaIds),
                orderBy: (agendas, { asc }) => [asc(agendas.createdAt)]
            })
        } else if (number && year) {
            // ALUR LANJUTAN: Mengambil semua agenda dalam satu sesi nomor rapat yang sama
            meetingAgendas = await db.query.agendas.findMany({
                where: and(
                    eq(agendas.meetingNumber, number),
                    eq(agendas.meetingYear, year),
                    eq(agendas.meetingType, "RAKORDIR")
                ),
                orderBy: (agendas, { asc }) => [asc(agendas.updatedAt)]
            })
        }
    } catch (error) {
        console.error("[FETCH_RAKORDIR_ERROR]:", error)
    }

    // 4. State: Data Kosong (Data tidak ditemukan atau terhapus)
    if (!meetingAgendas || meetingAgendas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
                <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl max-w-md text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 shadow-inner">
                        <AlertCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-xl font-black text-[#125d72] uppercase tracking-tight">
                            Materi Tidak Ditemukan
                        </h1>
                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed uppercase italic">
                            Maaf, sesi rapat yang Anda tuju tidak tersedia atau ID agenda sudah kadaluarsa.
                        </p>
                    </div>
                    <Button asChild className="w-full bg-[#125d72] hover:bg-[#0e4b5d] rounded-2xl h-12 font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95">
                        <Link href="/pelaksanaan-rapat/rakordir">
                            <ChevronLeft className="h-4 w-4 mr-2" /> Kembali ke Monitoring
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    // 5. Render Bulk Client (UX Seperti Radir)
    return (
        <main className="h-screen overflow-hidden bg-white">
            <RakordirBulkMeetingClient
                agendas={meetingAgendas}
                passedYear={year}
                passedNumber={number}
            />
        </main>
    )
}