import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { desc, eq, and, isNull } from "drizzle-orm";
// ✅ Import interface AgendaRadir untuk menghilangkan penggunaan 'any'
import { RadirClient, type AgendaRadir } from "@/components/dashboard/agenda/radir/radir-client";

export const dynamic = "force-dynamic";

export default async function RadirPage() {
    // 1. Ambil data dengan filter meetingType = 'RADIR'
    const rawData = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RADIR"),
            isNull(agendas.cancellationReason)
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // 2. Mapping data dengan tipe yang ketat (Strictly Typed)
    // ✅ Menggunakan interface AgendaRadir[] alih-alih any
    const formattedData: AgendaRadir[] = rawData.map((item) => ({
        id: item.id,
        title: item.title || "Tanpa Judul",
        urgency: item.urgency || "Normal",
        initiator: item.initiator || "Unit Pemrakarsa",
        status: item.status || "DRAFT",

        // Mengamankan casting dari unknown schema drizzle ke property yang diharapkan
        contactPerson: (item as unknown as { contactPerson?: string | null }).contactPerson ?? "-",

        // Konversi Date ke String ISO (Client component akan menerima string ini)
        // ✅ Pastikan interface AgendaRadir di radir-client.tsx sudah mendukung string | null pada deadline
        deadline: item.deadline ? new Date(item.deadline).toISOString() : null,

        // Field tambahan opsional
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    }));

    return (
        <main className="p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="space-y-6">

                {/* ✅ Sekarang aman tanpa 'any', ESLint Error 8 (Unexpected any) hilang */}
                <RadirClient data={formattedData} />
            </div>
        </main>
    );
}