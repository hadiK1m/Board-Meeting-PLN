import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { ne, and, eq, desc } from "drizzle-orm"; // ✅ Tambahkan 'and', 'eq', 'desc'
import { RadirReadyClient, type AgendaReady } from "@/components/dashboard/agenda-siap/radir/radir-ready-client";

export const dynamic = "force-dynamic"; // Opsional: Memastikan data selalu fresh

export default async function RadirSiapPage() {
    // 1. Ambil data dari database dengan filter yang BENAR
    const allAgendas = await db.query.agendas.findMany({
        where: and(
            ne(agendas.status, "Draft"),      // Bukan Draft
            eq(agendas.meetingType, "RADIR")  // ✅ WAJIB: Hanya ambil tipe RADIR
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // 2. Mapping data agar sesuai dengan interface AgendaReady
    const formattedAgendas: AgendaReady[] = allAgendas.map((agenda) => ({
        id: agenda.id,
        // ✅ Berikan fallback agar tidak error jika data null
        title: agenda.title || "Tanpa Judul",
        urgency: agenda.urgency || "Normal",
        // ✅ Pastikan deadline menjadi objek Date yang valid
        deadline: agenda.deadline ? new Date(agenda.deadline) : new Date(),
        initiator: agenda.initiator || "-",
        status: agenda.status || "DAPAT_DILANJUTKAN",
        contactPerson: agenda.contactPerson || "-",
        cancellationReason: agenda.cancellationReason ?? null,

        // Field optional (jika diperlukan untuk detail sheet)
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
            <RadirReadyClient data={formattedAgendas} />
        </main>
    );
}