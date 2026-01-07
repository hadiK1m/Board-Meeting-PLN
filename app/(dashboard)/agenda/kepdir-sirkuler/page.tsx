import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { desc, eq } from "drizzle-orm"
import KepdirClient from "@/components/dashboard/agenda/kepdir-sirkuler/kepdir-client"

export const dynamic = "force-dynamic"

export default async function KepdirSirkulerPage() {
    // 1. Fetching data khusus KEPDIR_SIRKULER
    const data = await db.query.agendas.findMany({
        where: eq(agendas.meetingType, "KEPDIR_SIRKULER"),
        orderBy: [desc(agendas.createdAt)],
    });

    /**
     * 2. Sanitization Data
     * Membersihkan data JSONB (notRequiredFiles & supportingDocuments) 
     * untuk mencegah error "Double Stringify" di sisi Client.
     */
    const formattedAgendas = data.map((item) => {
        let nrFiles = item.notRequiredFiles;

        // Cek jika data tersimpan sebagai string kotor: "\"[\"...\"]\""
        if (typeof nrFiles === 'string') {
            try {
                const firstParse = JSON.parse(nrFiles);
                nrFiles = typeof firstParse === 'string' ? JSON.parse(firstParse) : firstParse;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
                nrFiles = [];
            }
        }

        return {
            ...item,
            // Pastikan dikirim sebagai Array murni ke Client
            notRequiredFiles: Array.isArray(nrFiles) ? nrFiles : [],
            supportingDocuments: Array.isArray(item.supportingDocuments) ? item.supportingDocuments : []
        };
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#125d72]">
                        Kepdir Sirkuler
                    </h2>
                    <p className="text-muted-foreground text-sm italic">
                        Pengelolaan dokumen keputusan direksi melalui mekanisme sirkuler.
                    </p>
                </div>
                {/* Komponen Add Modal akan dipanggil di dalam KepdirClient atau di sini */}
            </div>

            <div className="grid gap-4">
                {/* 3. Komponen Client 
                    Mengirim data yang sudah diformat ke Client Component 
                */}
                <KepdirClient initialData={formattedAgendas} />
            </div>
        </div>
    )
}