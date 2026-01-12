import { Metadata } from "next"
import { HeaderBreadcrumb } from "@/components/dashboard/header-breadcrumb"
import { getMonevRadirList } from "@/server/actions/monev-radir-actions"
import { MonevRadirClient } from "@/components/dashboard/monev/radir/monev-radir-client"

export const metadata: Metadata = {
    title: "Monev Radir | Board Meeting PLN",
    description: "Monitoring dan Evaluasi Tindak Lanjut Rapat Direksi",
}

export default async function MonevRadirPage() {
    // 1. Fetch Data dari Server Action
    const { success, data, error } = await getMonevRadirList()

    if (!success || !data) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200 m-6">
                <h3 className="font-bold">Gagal memuat data</h3>
                <p>{error}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header dengan Breadcrumb */}
            <HeaderBreadcrumb
                title="Monitoring & Evaluasi (RADIR)"
                breadcrumb={[{ label: "Monev" }, { label: "Radir" }]}
            />

            <div className="flex-1 p-6 space-y-6 overflow-auto">
                {/* Client Component untuk Tabel & Interaksi */}
                <MonevRadirClient initialData={data} />
            </div>
        </div>
    )
}