import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { ne, and, eq, desc } from "drizzle-orm";
import { RadirSiapClient, type AgendaReady } from "@/components/dashboard/agenda-siap/radir/radir-siap-client";

export const dynamic = "force-dynamic";

export default async function RadirSiapPage() {
    // 1. Ambil data dari database dengan filter RADIR dan bukan DRAFT
    const allAgendas = await db.query.agendas.findMany({
        where: and(
            ne(agendas.status, "DRAFT"),      // Sesuaikan case sensitivity dengan enum DB Anda
            eq(agendas.meetingType, "RADIR")  // Filter hanya tipe RADIR
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // 2. Mapping data agar sesuai dengan interface AgendaReady di Client Component
    const formattedAgendas: AgendaReady[] = allAgendas.map((agenda) => ({
        id: agenda.id,
        title: agenda.title || "Tanpa Judul",
        urgency: agenda.urgency || "Normal",
        // Konversi deadline ke objek Date untuk dikirim ke Client
        deadline: agenda.deadline ? new Date(agenda.deadline) : new Date(),
        initiator: agenda.initiator || "-",
        status: agenda.status || "DAPAT_DILANJUTKAN",
        contactPerson: agenda.contactPerson || "-",
        cancellationReason: agenda.cancellationReason ?? null,

        // Field pendukung untuk Detail Sheet
        director: agenda.director || null,
        support: agenda.support || null,
        position: agenda.position || null,
        phone: agenda.phone || null,
        legalReview: agenda.legalReview || null,
        riskReview: agenda.riskReview || null,
        complianceReview: agenda.complianceReview || null,
        recommendationNote: agenda.recommendationNote || null,
        presentationMaterial: agenda.presentationMaterial || null,
    }));

    return (
        <main className="p-6">
            <RadirSiapClient data={formattedAgendas} />
        </main>
    );
}