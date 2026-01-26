"use client" // ✅ Wajib ada di sini

import dynamic from "next/dynamic"
import { type AgendaReady } from "./jadwal-rapat-client"

// Dynamic import client component
const JadwalRapatClient = dynamic(
    () => import("./jadwal-rapat-client").then(mod => mod.JadwalRapatClient),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-100 w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#14a2ba] border-t-transparent"></div>
                    <p className="text-sm font-bold text-slate-400 animate-pulse">Memuat Data Jadwal Rapat...</p>
                </div>
            </div>
        )
    }
)

// Tambahkan tour khusus jadwal-rapat
import JadwalRapatTour from "./jadwal-rapat-tour"

export function JadwalRapatWrapper({ data }: { data: AgendaReady[] }) {
    return (
        <>
            {/* Non-invasive: tour hanya UI overlay, tidak mengubah data/logika */}
            <JadwalRapatTour />
            <JadwalRapatClient data={data} />
        </>
    )
}