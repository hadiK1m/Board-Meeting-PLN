import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { desc, eq, and, isNull } from "drizzle-orm";
import { RakordirClient, type RakordirAgenda } from "@/components/dashboard/agenda/rakordir/rakordir-client";

export const dynamic = "force-dynamic";

export default async function RakordirPage() {
    // 1. Ambil data
    const rawAgendas = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RAKORDIR"),
            isNull(agendas.cancellationReason)
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // Helper: normalisasi supporting_documents ke string[] | null
    const normalizeSupporting = (raw: unknown): string[] | null => {
        if (raw === undefined || raw === null) return null;
        if (Array.isArray(raw)) return raw.map(String);

        if (typeof raw === 'string') {
            const s = raw.trim();
            if (s === '' || s === 'null') return null;
            if (s === '[]' || s === '"[]"') return [];
            try {
                let parsed: unknown = JSON.parse(s);
                // Handle double encoded string if necessary
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch {
                        // ignore, keep as string
                    }
                }
                if (Array.isArray(parsed)) return (parsed as unknown[]).map(String);
            } catch {
                return [s];
            }
        }
        return null;
    };

    // ✅ Final mapping: Menggunakan Type Intersection untuk menghindari 'any'
    const formattedAgendas: RakordirAgenda[] = rawAgendas.map((data) => {
        // Kita casting 'data' agar TypeScript tahu bahwa properti snake_case mungkin ada (untuk fallback)
        // meskipun Drizzle Schema mungkin mendefinisikannya sebagai camelCase.
        const item = data as typeof data & {
            contact_person?: string | null;
            proposal_note?: string | null;
            presentation_material?: string | null;
            supporting_documents?: unknown;
            created_at?: Date | string | null;
            updated_at?: Date | string | null;
        };

        return {
            id: item.id,
            title: item.title,
            urgency: item.urgency,
            // Konversi date ke string ISO
            deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
            status: item.status,
            initiator: item.initiator,

            // Gunakan || null atau fallback string "-" jika data wajib
            director: item.director || null,
            support: item.support || null,
            priority: item.priority || null,
            position: item.position || null,
            phone: item.phone || null,

            // Mapping field Narahubung (Prioritas camelCase, fallback ke snake_case)
            contactPerson: item.contactPerson || item.contact_person || null,

            // Mapping Lampiran
            proposalNote: item.proposalNote || item.proposal_note || null,
            presentationMaterial: item.presentationMaterial || item.presentation_material || null,
            supportingDocuments: normalizeSupporting(item.supportingDocuments || item.supporting_documents), // normalizeSupporting return string[] | null, tapi interface mungkin butuh string[]? Sesuaikan di bawah jika perlu.

            // Timestamps (Opsional, jika interface RakordirAgenda membutuhkannya)
            // createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : (item.created_at ? new Date(item.created_at).toISOString() : null),
        };
    });

    return (
        <main className="p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="space-y-6">
                <RakordirClient initialData={formattedAgendas} />
            </div>
        </main>
    );
}