/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { desc, eq, and, isNotNull, isNull } from "drizzle-orm";
import { Presentation, List, LayoutGrid } from "lucide-react";
import { RakordirListView } from "@/components/dashboard/pelaksanaan-rapat/rakordir/rakordir-list-view";
import { StartRakordirDialog } from "@/components/dashboard/pelaksanaan-rapat/rakordir/start-rakordir-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PelaksanaanRakordirPage() {
    // 1. Ambil data agenda RAKORDIR yang SUDAH memiliki Nomor Meeting (Untuk Tabel Monitoring)
    const rawAgendas = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RAKORDIR"),
            isNotNull(agendas.meetingNumber)
        ),
        orderBy: [desc(agendas.meetingYear), desc(agendas.meetingNumber)],
    });

    // 2. Ambil agenda RAKORDIR yang BELUM punya nomor meeting & berstatus 'DIJADWALKAN'
    // Data inilah yang akan muncul di dalam Modal "Buat Notulensi Baru"
    const readyAgendas = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RAKORDIR"),
            isNull(agendas.meetingNumber),
            eq(agendas.status, "DIJADWALKAN") // Sesuai dengan status di database Anda
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // 3. Logika Grouping: Mengelompokkan Agenda berdasarkan Nomor Meeting & Tahun
    const groupedMeetings = rawAgendas.reduce((acc: any[], current) => {
        const mNumber = current.meetingNumber || "TBD";
        const mYear = current.meetingYear || new Date().getFullYear().toString();
        const key = `${mNumber}-${mYear}`;

        const existingGroup = acc.find(item => item.groupKey === key);

        if (existingGroup) {
            existingGroup.agendas.push(current);
        } else {
            acc.push({
                groupKey: key,
                meetingNumber: mNumber,
                meetingYear: mYear,
                executionDate: current.executionDate,
                location: current.meetingLocation,
                status: current.meetingStatus || "PENDING",
                agendas: [current]
            });
        }
        return acc;
    }, []);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/50 min-h-screen">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#125d72] rounded-xl shadow-lg">
                        <Presentation className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-[#125d72] uppercase leading-none">
                            Monitoring Rakordir
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-bold italic uppercase opacity-70 mt-1">
                            Pemantauan Hasil Notulensi Rapat Koordinasi Direksi
                        </p>
                    </div>
                </div>

                {/* Tombol Aksi: Membuka Dialog dengan data agenda yang siap dirapatkan */}
                <StartRakordirDialog readyAgendas={readyAgendas} />
            </div>

            <hr className="border-slate-200" />

            {/* TAB VIEW SWITCHER & CONTENT */}
            <Tabs defaultValue="table" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-200/50 p-1 border rounded-xl">
                        <TabsTrigger
                            value="table"
                            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#125d72] rounded-lg transition-all"
                        >
                            <List className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Table View</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="grid"
                            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#125d72] rounded-lg transition-all"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Grid View</span>
                        </TabsTrigger>
                    </TabsList>

                    <div className="hidden md:flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-black bg-white border-slate-200 text-[#14a2ba] py-2 px-4 rounded-xl shadow-sm uppercase">
                            {readyAgendas.length} Agenda Siap RAPAT
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-black bg-[#125d72] border-none text-white py-2 px-4 rounded-xl shadow-sm uppercase">
                            Total {groupedMeetings.length} Sesi Rapat
                        </Badge>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <TabsContent value="table" className="mt-0 outline-none border-none">
                    <RakordirListView initialData={groupedMeetings} viewMode="table" />
                </TabsContent>

                <TabsContent value="grid" className="mt-0 outline-none border-none">
                    <RakordirListView initialData={groupedMeetings} viewMode="grid" />
                </TabsContent>
            </Tabs>
        </div>
    );
}