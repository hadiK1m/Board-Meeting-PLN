import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { ne, desc } from "drizzle-orm";
import { RadirReadyClient, type AgendaReady } from "@/components/dashboard/agenda-siap/radir/radir-ready-client";

export const dynamic = "force-dynamic";

export default async function RadirSiapPage() {
    // 1. Ambil data dari database (exclude Draft)
    const allAgendas = await db.query.agendas.findMany({
        where: ne(agendas.status, "Draft"),
        orderBy: [desc(agendas.createdAt)],
    });

    // 2. Mapping data agar sesuai dengan interface AgendaReady
    const formattedAgendas: AgendaReady[] = allAgendas.map((agenda) => ({
        id: agenda.id,
        // ✅ FIX: Berikan default string jika data null (Mengatasi error build)
        title: agenda.title || "Tanpa Judul",
        urgency: agenda.urgency || "Normal",
        initiator: agenda.initiator || "-",
        status: agenda.status || "DAPAT_DILANJUTKAN",
        contactPerson: agenda.contactPerson || "-",

        // ✅ FIX: Pastikan deadline selalu object Date valid
        deadline: agenda.deadline ? new Date(agenda.deadline) : new Date(),

        cancellationReason: agenda.cancellationReason ?? null,

        // ✅ FIX: Sertakan field optional agar Detail Sheet berfungsi
        director: agenda.director || null,
        support: agenda.support || null,
        position: agenda.position || null,
        phone: agenda.phone || null,

        // Files
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