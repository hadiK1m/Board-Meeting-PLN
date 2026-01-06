// src/app/(dashboard)/agenda-siap/radir/page.tsx

import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { ne } from "drizzle-orm";
import { RadirReadyClient, type AgendaReady } from "@/components/dashboard/agenda-siap/radir/radir-ready-client";

export default async function RadirSiapPage() {
    // 1. Ambil data dari database
    const allAgendas = await db.query.agendas.findMany({
        where: ne(agendas.status, "Draft"),
        orderBy: (agendas, { desc }) => [desc(agendas.createdAt)],
    });

    // 2. Mapping data agar sesuai dengan interface AgendaReady
    // Ini menghilangkan error "any" dan memastikan tipe data deadline konsisten
    const formattedAgendas: AgendaReady[] = allAgendas.map((agenda) => ({
        id: agenda.id,
        title: agenda.title,
        urgency: agenda.urgency,
        deadline: new Date(agenda.deadline), // Pastikan menjadi objek Date
        initiator: agenda.initiator,
        status: agenda.status,
        contactPerson: agenda.contactPerson,
        cancellationReason: agenda.cancellationReason ?? null, // Handle undefined
    }));

    return (
        <main className="p-6">
            <RadirReadyClient data={formattedAgendas} />
        </main>
    );
}