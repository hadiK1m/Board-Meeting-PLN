import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { or, eq } from "drizzle-orm";
// ✅ Import Wrapper yang baru dibuat
import { JadwalRapatWrapper } from "@/components/dashboard/jadwal-rapat/jadwal-rapat-wrapper";
import { type AgendaReady } from "@/components/dashboard/jadwal-rapat/jadwal-rapat-client";

export const metadata = {
    title: "Jadwal Rapat | Board Meeting PLN",
};

export default async function JadwalRapatPage() {
    const allData = await db.query.agendas.findMany({
        where: or(
            eq(agendas.status, "DAPAT_DILANJUTKAN"),
            eq(agendas.status, "DIJADWALKAN")
        ),
        orderBy: (agendas, { desc }) => [desc(agendas.updatedAt)],
    });

    const formattedData: AgendaReady[] = allData.map((agenda) => ({
        id: agenda.id,
        title: agenda.title,
        urgency: agenda.urgency,
        deadline: new Date(agenda.deadline),
        initiator: agenda.initiator,
        status: agenda.status,
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
        executionDate: agenda.executionDate ?? null,
        startTime: agenda.startTime ?? null,
        endTime: agenda.endTime ?? "Selesai",
        meetingMethod: agenda.meetingMethod ?? null,
        meetingLocation: agenda.meetingLocation ?? null,
        meetingLink: agenda.meetingLink ?? null,
    }));

    return (
        <main className="p-1">
            {/* ✅ Gunakan Wrapper untuk menghindari Hydration Error & Build Error */}
            <JadwalRapatWrapper data={formattedData} />
        </main>
    );
}