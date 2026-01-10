import React from "react"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { eq, and, desc, isNotNull } from "drizzle-orm"
import { Presentation, LayoutGrid, List } from "lucide-react"
import { RadirListView } from "@/components/dashboard/pelaksanaan-rapat/radir/radir-list-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StartMeetingDialog } from "@/components/dashboard/pelaksanaan-rapat/radir/start-meeting-dialog"

export default async function PelaksanaanRadirPage() {
    // 1. Ambil Semua Agenda RADIR yang sudah memiliki Nomor Meeting
    const allAgendas = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RADIR"),
            isNotNull(agendas.meetingNumber) // Hanya ambil yang sudah dijadwalkan/sidang
        ),
        orderBy: [desc(agendas.meetingYear), desc(agendas.meetingNumber)]
    });

    // 2. Kelompokkan Agenda berdasarkan meetingNumber + meetingYear (Satu Nomor = Satu Sesi)
    const groupedMeetings = allAgendas.reduce((acc: any[], current) => {
        const key = `${current.meetingNumber}-${current.meetingYear}`;
        const existingGroup = acc.find(item => item.groupKey === key);

        if (existingGroup) {
            existingGroup.agendas.push(current);
            // Update status grup: Jika ada satu saja yang COMPLETED, tandai sesi tersebut
            if (current.meetingStatus === "COMPLETED") {
                existingGroup.status = "COMPLETED";
            }
        } else {
            acc.push({
                groupKey: key,
                meetingNumber: current.meetingNumber,
                meetingYear: current.meetingYear,
                executionDate: current.executionDate,
                startTime: current.startTime,
                endTime: current.endTime,
                location: current.meetingLocation,
                status: current.meetingStatus || "SCHEDULED",
                agendas: [current]
            });
        }
        return acc;
    }, []);

    // 3. Data untuk Dropdown Start Meeting (Hanya yang statusnya DIJADWALKAN)
    const readyToMeetAgendas = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RADIR"),
            eq(agendas.status, "DIJADWALKAN")
        ),
        orderBy: [desc(agendas.priority), desc(agendas.createdAt)]
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/50 min-h-screen">
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
                        <p className="text-[10px] text-muted-foreground font-bold italic uppercase opacity-70">
                            Monitoring Pelaksanaan Rapat Per Nomor Meeting
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <StartMeetingDialog readyAgendas={readyToMeetAgendas} />
                </div>
            </div>

            <hr className="border-slate-200" />

            <Tabs defaultValue="table" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-200/50 p-1 border rounded-xl">
                        <TabsTrigger value="table" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#125d72] rounded-lg transition-all">
                            <List className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Table View</span>
                        </TabsTrigger>
                        <TabsTrigger value="grid" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#125d72] rounded-lg transition-all">
                            <LayoutGrid className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Grid View</span>
                        </TabsTrigger>
                    </TabsList>

                    <div className="hidden md:block">
                        <Badge variant="secondary" className="text-[10px] font-bold bg-white border-slate-200 text-slate-500 py-1 px-3 rounded-lg shadow-sm">
                            TOTAL {groupedMeetings.length} SESI RAPAT
                        </Badge>
                    </div>
                </div>

                <TabsContent value="table" className="mt-0 outline-none">
                    {/* initialData sekarang mengirimkan groupedMeetings */}
                    <RadirListView initialData={groupedMeetings} viewMode="table" />
                </TabsContent>

                <TabsContent value="grid" className="mt-0 outline-none">
                    <RadirListView initialData={groupedMeetings} viewMode="grid" />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// Komponen Badge Lokal untuk Header
function Badge({ children, className, variant }: any) {
    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
            {children}
        </div>
    )
}