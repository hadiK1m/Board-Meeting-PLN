import React from "react"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, desc, inArray } from "drizzle-orm" // Tambahkan inArray jika belum ada
import { Presentation, LayoutGrid, List } from "lucide-react"
import { RadirListView } from "@/components/dashboard/pelaksanaan-rapat/radir/radir-list-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Import komponen baru
import { StartMeetingDialog } from "@/components/dashboard/pelaksanaan-rapat/radir/start-meeting-dialog"

export default async function PelaksanaanRadirPage() {
    // 1. Ambil Semua Data untuk List Riwayat & Monitoring
    // (Asumsi: Anda ingin menampilkan yg dijadwalkan & yg selesai di list bawah)
    const agendaList = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RADIR"),
            // Jika ingin memfilter status tertentu saja, sesuaikan di sini
        ),
        orderBy: [desc(agendas.executionDate)]
    });

    // 2. Ambil Data Khusus untuk "Siap Sidang" (Dropdown Dialog)
    // Hanya yang statusnya DIJADWALKAN
    const readyToMeetAgendas = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RADIR"),
            eq(agendas.status, "DIJADWALKAN")
        ),
        orderBy: [desc(agendas.priority), desc(agendas.createdAt)]
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#125d72] rounded-xl shadow-lg">
                        <Presentation className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-[#125d72] uppercase">
                            Monitoring Rapat Radir
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium italic">
                            Daftar agenda yang siap disidangkan dan riwayat pelaksanaan rapat.
                        </p>
                    </div>
                </div>

                {/* TOMBOL START MEETING BARU DI SINI */}
                <div className="flex items-center gap-2">
                    <StartMeetingDialog readyAgendas={readyToMeetAgendas} />
                </div>
            </div>

            <hr className="border-slate-200" />

            {/* TAB VIEW SWITCHER (GRID vs TABLE) */}
            <Tabs defaultValue="table" className="w-full">
                {/* ... (Kode TabsList yang sudah ada tetap sama) ... */}
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100 p-1 border">
                        <TabsTrigger value="table" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#125d72]">
                            <List className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Table View</span>
                        </TabsTrigger>
                        <TabsTrigger value="grid" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#125d72]">
                            <LayoutGrid className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Grid View</span>
                        </TabsTrigger>
                    </TabsList>

                    <div className="hidden md:block text-[10px] font-bold text-slate-400 italic">
                        Total {agendaList.length} Agenda Ditemukan
                    </div>
                </div>

                <TabsContent value="table" className="mt-0">
                    <RadirListView initialData={agendaList} viewMode="table" />
                </TabsContent>

                <TabsContent value="grid" className="mt-0">
                    <RadirListView initialData={agendaList} viewMode="grid" />
                </TabsContent>
            </Tabs>
        </div>
    )
}