import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { desc, eq, and, ne } from "drizzle-orm"
// ✅ Pastikan import sesuai (Default Export vs Named Export)
// Jika Anda sudah mengubah client menjadi 'export function', gunakan { RakordirSiapClient }
// Jika masih 'export default', gunakan RakordirSiapClient
import RakordirSiapClient, { type AgendaReady } from "@/components/dashboard/agenda-siap/rakordir/rakordir-siap-client"

export const dynamic = "force-dynamic"

export default async function RakordirSiapPage() {
    // 1. Fetching data khusus RAKORDIR yang statusnya BUKAN Draft
    // Ini agar status 'DIJADWALKAN' atau 'DIBATALKAN' tetap muncul di list
    const data = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RAKORDIR"),
            ne(agendas.status, "Draft")
        ),
        orderBy: [desc(agendas.updatedAt)],
    });

    // 2. Mapping data agar type-safe (AgendaReady) dan menangani null
    const formattedAgendas: AgendaReady[] = data.map((item) => ({
        id: item.id,
        // ✅ Berikan fallback string kosong agar tidak error di client
        title: item.title || "Tanpa Judul",
        urgency: item.urgency || "Normal",
        initiator: item.initiator || "-",
        status: item.status || "DAPAT_DILANJUTKAN",
        contactPerson: item.contactPerson || "-",

        // ✅ Pastikan Deadline menjadi Object Date valid
        deadline: item.deadline ? new Date(item.deadline) : new Date(),

        cancellationReason: item.cancellationReason ?? null,

        // Field Optional Personil
        director: item.director || null,
        support: item.support || null,
        position: item.position || null,
        phone: item.phone || null,

        // Field Lampiran Khusus Rakordir
        proposalNote: item.proposalNote || null,
        presentationMaterial: item.presentationMaterial || null,
    }));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header dihapus disini karena sudah ada di dalam komponen RakordirSiapClient agar konsisten dengan Radir */}

            {/* ✅ FIX: Gunakan prop 'data' bukan 'initialData' */}
            <RakordirSiapClient data={formattedAgendas} />
        </div>
    )
}