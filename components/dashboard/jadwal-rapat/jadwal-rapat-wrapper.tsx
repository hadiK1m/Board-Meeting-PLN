"use client"

import dynamic from "next/dynamic"
import { type AgendaReady } from "./jadwal-rapat-client"

// ✅ Pindahkan dynamic import ke sini (Client-to-Client)
const JadwalRapatClientDynamic = dynamic(
    () => import("./jadwal-rapat-client").then(mod => mod.JadwalRapatClient),
    {
        ssr: false,
        loading: () => <div className="p-8 text-slate-400 animate-pulse font-bold">Memuat Dashboard Jadwal...</div>
    }
)

export function JadwalRapatWrapper({ data }: { data: AgendaReady[] }) {
    return <JadwalRapatClientDynamic data={data} />
}