import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { eq, isNotNull, desc as drizzleDesc, and, ne, or } from "drizzle-orm"; // Tambahkan isNotNull
import { JadwalRapatWrapper } from "@/components/dashboard/jadwal-rapat/jadwal-rapat-wrapper";
import { type AgendaReady } from "@/components/dashboard/jadwal-rapat/jadwal-rapat-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
    title: "Jadwal Rapat | Board Meeting PLN",
};

export default async function JadwalRapatPage() {
    // Logika baru: Ambil semua data yang statusnya 'DIJADWALKAN' 
    const allData = await db.query.agendas.findMany({
        where: and(
            // ✅ HAPUS eq(agendas.meetingType, "RAKORDIR")
            // Gunakan filter yang mengizinkan keduanya:
            or(
                eq(agendas.meetingType, "RADIR"),
                eq(agendas.meetingType, "RAKORDIR")
            ),
            ne(agendas.status, "DRAFT"),
            or(
                isNotNull(agendas.executionDate),
                eq(agendas.status, "DAPAT_DILANJUTKAN"),
                eq(agendas.status, "Dapat Dilanjutkan"),
                eq(agendas.status, "RAPAT_SELESAI")
            )
        ),
        orderBy: [drizzleDesc(agendas.updatedAt)],
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