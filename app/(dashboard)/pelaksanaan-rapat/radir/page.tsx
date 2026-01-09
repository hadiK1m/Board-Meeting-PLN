import React from "react"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, desc } from "drizzle-orm"
import { Presentation, LayoutGrid, List } from "lucide-react"
import { RadirListView } from "@/components/dashboard/pelaksanaan-rapat/radir/radir-list-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function PelaksanaanRadirPage() {
    // Mengambil data agenda yang sudah dijadwalkan (RADIR)
    const agendaList = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RADIR"),
            // Kita ambil status DIJADWALKAN (siap sidang) dan SELESAI_SIDANG (untuk riwayat)
        ),
        orderBy: [desc(agendas.executionDate)]
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
            </div>

            <hr className="border-slate-200" />

            {/* TAB VIEW SWITCHER (GRID vs TABLE) */}
            <Tabs defaultValue="table" className="w-full">
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

                {/* Content Table */}
                <TabsContent value="table" className="mt-0">
                    <RadirListView initialData={agendaList} viewMode="table" />
                </TabsContent>

                {/* Content Grid */}
                <TabsContent value="grid" className="mt-0">
                    <RadirListView initialData={agendaList} viewMode="grid" />
                </TabsContent>
            </Tabs>
        </div>
    )
}