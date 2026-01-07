"use client" // ✅ Wajib ada di sini

import dynamic from "next/dynamic"
import { type AgendaReady } from "./jadwal-rapat-client"

// ✅ Pindahkan logic dynamic import ke sini
const JadwalRapatClient = dynamic(
    () => import("./jadwal-rapat-client").then(mod => mod.JadwalRapatClient),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[400px] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#14a2ba] border-t-transparent"></div>
                    <p className="text-sm font-bold text-slate-400 animate-pulse">Memuat Data Jadwal Rapat...</p>
                </div>
            </div>
        )
    }
)

export function JadwalRapatWrapper({ data }: { data: AgendaReady[] }) {
    return <JadwalRapatClient data={data} />
}