import { db } from "@/db";
import { agendas } from "@/db/schema";
import { desc } from "drizzle-orm";
import { RadirClient } from "@/components/dashboard/agenda/radir/radir-client";

// Menonaktifkan cache agar data selalu terbaru (Dynamic Rendering)
export const revalidate = 0;

export default async function RadirPage() {
    // 1. Ambil data dari database secara server-side
    // Kita urutkan berdasarkan data terbaru (createdAt)
    const allAgendas = await db.query.agendas.findMany({
        orderBy: [desc(agendas.createdAt)],
    });

    // 2. Transformasi data jika diperlukan 
    // (Memastikan format Date tetap konsisten untuk Client Component)
    const formattedData = allAgendas.map((item) => ({
        ...item,
        deadline: new Date(item.deadline),
    }));

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {/* Kita kirim hasil query ke Client Component 
        menggunakan prop 'data' sesuai interface di RadirClient 
      */}
            <RadirClient data={formattedData} />
        </div>
    );
}