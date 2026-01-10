import { db } from "@/db";
import { agendas } from "@/db/schema/agendas";
import { desc, eq, and, isNull } from "drizzle-orm";
import { RadirClient, type AgendaRadir } from "@/components/dashboard/agenda/radir/radir-client";

export const dynamic = "force-dynamic";

export default async function RadirPage() {
    // 1. Ambil data
    const rawData = await db.query.agendas.findMany({
        where: and(
            eq(agendas.meetingType, "RADIR"),
            isNull(agendas.cancellationReason)
        ),
        orderBy: [desc(agendas.createdAt)],
    });

    // 2. Mapping data lengkap termasuk FILE
    const formattedData: AgendaRadir[] = rawData.map((item) => {
        // ✅ FIX: Gunakan 'unknown' atau union type daripada 'any' untuk menghindari ESLint error
        const typedItem = item as typeof item & {
            notRequiredFiles?: unknown;
            supportingDocuments?: unknown;
        };

        return {
            id: typedItem.id,
            title: typedItem.title || "Tanpa Judul",
            urgency: typedItem.urgency || "Normal",
            priority: typedItem.priority || "Low",
            initiator: typedItem.initiator || "Unit Pemrakarsa",
            status: typedItem.status || "DRAFT",
            deadline: typedItem.deadline ? new Date(typedItem.deadline).toISOString() : null,

            // Personil
            director: typedItem.director || null,
            support: typedItem.support || null,
            position: typedItem.position || "-",
            phone: typedItem.phone || "-",
            contactPerson: typedItem.contactPerson || "-",

            // FILES
            legalReview: typedItem.legalReview || null,
            riskReview: typedItem.riskReview || null,
            complianceReview: typedItem.complianceReview || null,
            regulationReview: typedItem.regulationReview || null,
            recommendationNote: typedItem.recommendationNote || null,
            proposalNote: typedItem.proposalNote || null,
            presentationMaterial: typedItem.presentationMaterial || null,

            // ✅ Cast ke array string atau array kosong
            supportingDocuments: (typedItem.supportingDocuments as string[]) || [],
            notRequiredFiles: (typedItem.notRequiredFiles as string[]) || [],
        };
    });

    return (
        <main className="p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="space-y-6">
                <RadirClient data={formattedData} />
            </div>
        </main>
    );
}