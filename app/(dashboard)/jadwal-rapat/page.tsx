import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { eq, isNotNull, desc as drizzleDesc, and, ne } from "drizzle-orm"; // Tambahkan isNotNull
import { JadwalRapatWrapper } from "@/components/dashboard/jadwal-rapat/jadwal-rapat-wrapper";
import { type AgendaReady } from "@/components/dashboard/jadwal-rapat/jadwal-rapat-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
    title: "Jadwal Rapat | Board Meeting PLN",
};

export default async function JadwalRapatPage() {
    // Logika baru: Ambil semua data yang statusnya 'DIJADWALKAN' 
    // ATAU yang kolom executionDate-nya sudah terisi (tidak null)
    const allData = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RAKORDIR"), // Atau hapus filter ini jika ingin semua
            // Ambil semua yang sudah punya tanggal eksekusi, apa pun statusnya (kecuali Draft)
            isNotNull(agendas.executionDate),
            ne(agendas.status, "DRAFT")
        ),
        orderBy: [drizzleDesc(agendas.executionDate)],
    });

    const formattedData: AgendaReady[] = allData.map((agenda) => ({
        id: agenda.id,
        title: agenda.title ?? "Tanpa Judul",
        urgency: agenda.urgency ?? "Normal",
        deadline: agenda.deadline ? new Date(agenda.deadline) : new Date(),
        initiator: agenda.initiator ?? "-",
        status: agenda.status ?? "",
        meetingType: agenda.meetingType ?? "RADIR",
        director: agenda.director ?? null,
        support: agenda.support ?? null,
        contactPerson: agenda.contactPerson ?? null,
        position: agenda.position ?? null,
        phone: agenda.phone ?? null,
        legalReview: agenda.legalReview ?? null,
        riskReview: agenda.riskReview ?? null,
        complianceReview: agenda.complianceReview ?? null,
        recommendationNote: agenda.recommendationNote ?? null,
        presentationMaterial: agenda.presentationMaterial ?? null,
        executionDate: agenda.executionDate ?? null, // Kolom kunci
        startTime: agenda.startTime ?? null,
        endTime: agenda.endTime ?? "Selesai",
        meetingMethod: agenda.meetingMethod ?? null,
        meetingLocation: agenda.meetingLocation ?? null,
        meetingLink: agenda.meetingLink ?? null,
    }));

    return (
        <main className="p-5 bg-slate-50/50 min-h-screen">
            <div className=" mx-auto">
                <JadwalRapatWrapper data={formattedData} />
            </div>
        </main>
    );
}