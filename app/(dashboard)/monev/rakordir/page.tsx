/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { Metadata } from "next"
import { getMonevRakordirList } from "@/server/actions/monev-rakordir-actions"
import { MonevRakordirClient } from "@/components/dashboard/monev/rakordir/monev-rakordir-client"

export const metadata: Metadata = {
    title: "Monev Rakordir | Board Meeting PLN",
    description: "Monitoring dan Evaluasi Tindak Lanjut Rapat Koordinasi Direksi",
}

export default async function MonevRakordirPage() {
    const { success, data, error } = await getMonevRakordirList()

    if (!success || !data) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200 m-6">
                <h3 className="font-bold">Gagal memuat data</h3>
                <p>{error}</p>
            </div>
        )
    }

    // ✅ Transform data dari server ke format yang diharapkan client
    const transformedData = data.map(item => ({
        id: item.id,
        title: item.title,
        meetingNumber: item.meetingNumber,
        meetingYear: item.meetingYear,
        executionDate: item.executionDate,
        initiator: item.initiator,
        contactPerson: item.contactPerson,
        position: item.position,
        phone: item.phone,
        risalahTtd: item.risalahTtd,
        petikanRisalah: item.petikanRisalah,
        monevStatus: item.monevStatus,
        // Pastikan arahanDireksi bertipe ArahanItem[]
        arahanDireksi: Array.isArray(item.arahanDireksi) ? item.arahanDireksi.map((arahan: any) => ({
            id: arahan.id || '',
            text: arahan.text || '',
            targetOutput: arahan.targetOutput,
            currentProgress: arahan.currentProgress,
            evidencePath: arahan.evidencePath,
            status: arahan.status === "DONE" ? "DONE" : "ON_PROGRESS" as "ON_PROGRESS" | "DONE",
            lastUpdated: arahan.lastUpdated
        })) : [],
        // Untuk backward compatibility
        meetingDecisions: Array.isArray(item.meetingDecisions) ? item.meetingDecisions : []
    }))

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6 space-y-6 overflow-auto">
                <MonevRakordirClient initialData={transformedData} />
            </div>
        </div>
    )
}