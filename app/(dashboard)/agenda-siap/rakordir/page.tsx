import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { ne, and, eq, desc } from "drizzle-orm";
import { RakordirSiapClient, type AgendaReady } from "@/components/dashboard/agenda-siap/rakordir/rakordir-siap-client";

export const dynamic = "force-dynamic";

export default async function RakordirSiapPage() {
    // 1. Ambil data dari database: Tipe RAKORDIR dan bukan DRAFT
    const allAgendas = await db.query.agendas.findMany({
        where: and(
            ne(agendas.status, "DRAFT"),        // Menampilkan yang siap rapat, terjadwal, atau batal
            eq(agendas.meetingType, "RAKORDIR")  // Khusus Rakordir
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // 2. Mapping data ke interface AgendaReady dengan aman (Tanpa 'any')
    const formattedAgendas: AgendaReady[] = allAgendas.map((agenda) => ({
        id: agenda.id,
        title: agenda.title || "Tanpa Judul",
        urgency: agenda.urgency || "Normal",
        // Konversi string/null date ke objek Date asli
        deadline: agenda.deadline ? new Date(agenda.deadline) : new Date(),
        initiator: agenda.initiator || "-",
        status: agenda.status || "DAPAT_DILANJUTKAN",
        contactPerson: agenda.contactPerson || "-",
        cancellationReason: agenda.cancellationReason ?? null,

        // Field opsional untuk Detail Sheet Rakordir
        director: agenda.director || null,
        support: agenda.support || null,
        position: agenda.position || null,
        phone: agenda.phone || null,
        proposalNote: agenda.proposalNote || null,
        presentationMaterial: agenda.presentationMaterial || null,
    }));

    return (
        <main className="p-6">
            {/* Mengirimkan data yang sudah terformat ke Client Component */}
            <RakordirSiapClient data={formattedAgendas} />
        </main>
    );
}