import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { desc, eq, and, isNull } from "drizzle-orm";
import { RakordirClient, RakordirAgenda } from "@/components/dashboard/agenda/rakordir/rakordir-client";

export const dynamic = "force-dynamic";

export default async function RakordirPage() {
    const rawAgendas = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RAKORDIR"),
            isNull(agendas.cancellationReason)
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // Helper: normalisasi supporting_documents ke string[] | null
    const normalizeSupporting = (raw: unknown): string[] | null => {
        if (raw === undefined || raw === null) return null
        // already array
        if (Array.isArray(raw)) return raw.map(String)

        // handle common string cases
        if (typeof raw === 'string') {
            const s = raw.trim()
            if (s === '' || s === 'null') return null
            if (s === '[]' || s === '"[]"') return []
            try {
                let parsed: unknown = JSON.parse(s)
                // double encoded
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed)
                    } catch {
                        // leave as-is
                    }
                }
                if (Array.isArray(parsed)) return (parsed as unknown[]).map(String)
            } catch {
                // not json, maybe a single path string
                return [s]
            }
        }

        return null
    }

    // ✅ Final mapping: map snake_case DB columns to client-facing props
    const formattedAgendas: RakordirAgenda[] = rawAgendas.map((item: any) => ({
        ...item,
        id: item.id,
        title: item.title,
        urgency: item.urgency,
        deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
        status: item.status,
        initiator: item.initiator,
        director: item.director ?? item.director,
        support: item.support ?? item.support,
        priority: item.priority ?? item.priority,
        position: item.position ?? item.position,
        phone: item.phone ?? item.phone,

        // Mapping field Narahubung (Database: contact_person)
        contactPerson: item.contact_person || item.contactPerson,

        // Mapping Lampiran (Database: snake_case) - normalized to array|null
        proposalNote: item.proposal_note ?? item.proposalNote ?? null,
        presentationMaterial: item.presentation_material ?? item.presentationMaterial ?? null,
        supportingDocuments: normalizeSupporting(item.supporting_documents ?? item.supportingDocuments ?? null),

        // Timestamps (snake_case)
        createdAt: item.created_at ? new Date(item.created_at).toISOString() : null,
        updatedAt: item.updated_at ? new Date(item.updated_at).toISOString() : null,
    }));

    return (
        <main className="p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className=" space-y-6">

                {/* ✅ Error TS2322 hilang karena formattedAgendas sudah sesuai tipe RakordirAgenda[] */}
                <RakordirClient initialData={formattedAgendas} />
            </div>
        </main>
    );
} 