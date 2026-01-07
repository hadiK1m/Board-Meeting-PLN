// src/app/(dashboard)/agenda/kepdir-sirkuler/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";

// Import komponen client yang sudah kita buat
import { KepdirClient } from "@/components/dashboard/agenda/kepdir-sirkuler/kepdir-client";
// Pastikan mengambil dari file data yang benar
import { getKepdirSirkulerAgendas } from "@/server/data/agenda-data";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
    title: "Kepdir Sirkuler | Board Meeting PLN",
    description: "Manajemen Usulan Keputusan Direksi Sirkuler",
};

/**
 * Loading state (Skeleton) yang disesuaikan class-nya agar tidak ada warning tailwind
 */
function KepdirLoading() {
    return (
        <div className="w-full space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64 bg-slate-200" />
                    <Skeleton className="h-4 w-40 bg-slate-100" />
                </div>
                <Skeleton className="h-12 w-40 bg-slate-200" />
            </div>
            {/* Menggunakan h-125 sebagai ganti h-[500px] sesuai rekomendasi linter */}
            <Skeleton className="h-125 w-full rounded-2xl bg-slate-50" />
        </div>
    );
}

export default async function KepdirSirkulerPage() {
    // Fetch data secara asinkron di server
    const data = await getKepdirSirkulerAgendas();

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Suspense fallback={<KepdirLoading />}>
                {/* initialData dipastikan menerima array (fallback ke empty array []) */}
                <KepdirClient initialData={data ?? []} />
            </Suspense>
        </div>
    );
}