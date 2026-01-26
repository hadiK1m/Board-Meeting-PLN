import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { HeaderBreadcrumb } from "@/components/dashboard/header-breadcrumb"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

// TAMBAHKAN: tombol pemicu tour (client component)
import TourTriggerButton from "@/components/dashboard/tour-trigger-button"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />

                        {/* Implementasi Breadcrumb Dinamis */}
                        <HeaderBreadcrumb />
                    </div>

                    {/* Tombol di pojok kanan header */}
                    <div className="ml-auto flex items-center gap-2">
                        <TourTriggerButton />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 bg-slate-50/50">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}