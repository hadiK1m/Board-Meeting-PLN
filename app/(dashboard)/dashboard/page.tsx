import { Metadata } from "next"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export const metadata: Metadata = {
    title: "Dashboard | Board Meeting PLN",
    description: "Ringkasan Eksekutif Aktivitas Rapat",
}

export default function DashboardPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc]">
            <div className="flex-1 p-8 space-y-6">
                <DashboardClient />
            </div>
        </div>
    )
}