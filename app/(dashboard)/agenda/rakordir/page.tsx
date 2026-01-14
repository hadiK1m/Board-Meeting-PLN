/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { desc, eq } from "drizzle-orm"; // Hapus isNull dari import jika tidak dipakai
import { RakordirClient, type RakordirAgenda } from "@/components/dashboard/agenda/rakordir/rakordir-client";

export const dynamic = "force-dynamic";

export default async function RakordirPage() {
    // 1. Ambil data - Sekarang mengambil SEMUA status (Termasuk Batal & Tunda)
    const rawAgendas = await db.query.agendas.findMany({
        where: eq(agendas.meetingType, "RAKORDIR"),
        orderBy: [desc(agendas.createdAt)],
    });

    // Helper: normalisasi supporting_documents (Tetap sama)
    const normalizeSupporting = (raw: unknown): string[] | null => {
        // ... (kode helper Anda tetap sama)
        if (raw === undefined || raw === null) return null;
        if (Array.isArray(raw)) return raw.map(String);
        if (typeof raw === 'string') {
            const s = raw.trim();
            if (s === '' || s === 'null') return null;
            if (s === '[]' || s === '"[]"') return [];
            try {
                let parsed: unknown = JSON.parse(s);
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch { }
                }
                if (Array.isArray(parsed)) return (parsed as unknown[]).map(String);
            } catch { return [s]; }
        }
        return null;
    };

    // 2. Final mapping
    const formattedAgendas: RakordirAgenda[] = rawAgendas.map((data) => {
        const item = data as typeof data & {
            contact_person?: string | null;
            proposal_note?: string | null;
            presentation_material?: string | null;
            supporting_documents?: unknown;
            cancellation_reason?: string | null; // Tambahkan fallback jika perlu
        };

        return {
            id: item.id,
            title: item.title,
            urgency: item.urgency,
            deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
            status: item.status,
            initiator: item.initiator,
            director: item.director || null,
            support: item.support || null,
            priority: item.priority || null,
            position: item.position || null,
            phone: item.phone || null,
            contactPerson: item.contactPerson || item.contact_person || null,
            proposalNote: item.proposalNote || item.proposal_note || null,
            presentationMaterial: item.presentationMaterial || item.presentation_material || null,
            supportingDocuments: normalizeSupporting(item.supportingDocuments || item.supporting_documents),

            // ✅ Tambahkan mapping alasan pembatalan agar bisa dibaca di Detail Sheet
            cancellationReason: item.cancellationReason || item.cancellation_reason || null,
            postponedReason: (item as any).postponedReason || null,
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