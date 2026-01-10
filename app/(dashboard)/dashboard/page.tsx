import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    return (
        <div className="flex flex-col gap-4 p-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Selamat datang, {user.email}</p>

            {/* Placeholder content */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="font-semibold leading-none tracking-tight">Total Rapat</div>
                    <div className="mt-2 text-2xl font-bold">0</div>
                </div>
            </div>
        </div>
    );
}