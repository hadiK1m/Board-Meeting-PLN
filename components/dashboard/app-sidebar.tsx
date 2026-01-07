"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
    BookOpen,
    LayoutDashboard,
    CalendarCheck,
    // FileSignature, // Tidak perlu di-import jika tidak dipakai di level induk
} from "lucide-react"

import { NavMain } from "@/components/dashboard/nav-main"
import { NavUser } from "@/components/dashboard/nav-user"
import { TeamSwitcher } from "@/components/dashboard/team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"

// Data dummy
const data = {
    user: {
        name: "Admin Board",
        email: "admin@pln.co.id",
        avatar: "/avatars/01.png",
    },
    teams: [
        {
            name: "PT PLN (Persero)",
            logo: "/logo-pln.png",
            plan: "Board Meeting",
        },
    ],
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Usulan Agenda",
            url: "#",
            icon: BookOpen,
            items: [
                {
                    title: "Radir",
                    url: "/agenda/radir",
                },
                {
                    title: "Rakordir",
                    url: "/agenda/rakordir",
                },
                {
                    title: "Kepdir Sirkuler", // ✅ Menu Baru
                    url: "/agenda/kepdir-sirkuler", // Ubah 'href' menjadi 'url' agar konsisten
                    // icon: FileSignature, // Biasanya sub-menu tidak pakai icon agar rapi
                },
            ],
        },
        {
            title: "Daftar Agenda Siap",
            url: "#",
            icon: CalendarCheck,
            items: [
                {
                    title: "Radir Siap",
                    url: "/agenda-siap/radir",
                },
                {
                    title: "Rakordir Siap",
                    url: "/agenda-siap/rakordir",
                },
                // OPSI: Tambahkan juga Kepdir Siap jika diperlukan
                // {
                //   title: "Kepdir Sirkuler Siap",
                //   url: "/agenda-siap/kepdir-sirkuler",
                // },
            ],
        },
        {
            title: "Jadwal Rapat",
            url: "/jadwal-rapat",
            icon: CalendarCheck,
        },
    ],
}

function SidebarBase({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

export const AppSidebar = dynamic(() => Promise.resolve(SidebarBase), {
    ssr: false,
    loading: () => <div className="w-(--sidebar-width) bg-sidebar border-r flex flex-col h-screen" />,
})