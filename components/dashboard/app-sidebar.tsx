"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Image from "next/image" // ✅ Import Next Image
import {
    BookOpen,
    Settings2,
    LayoutDashboard,
    CalendarCheck,
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

const data = {
    user: {
        name: "Admin Board",
        email: "admin@pln.co.id",
        avatar: "/avatars/01.png",
    },
    teams: [
        {
            name: "PT PLN (Persero)",
            logo: "/logo-pln.png", // ✅ Path folder public
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
                { title: "Radir", url: "/agenda/radir" },
                { title: "Rakordir", url: "/agenda/rakordir" },
            ],
        },
        {
            title: "Daftar Agenda Siap",
            url: "#",
            icon: CalendarCheck,
            items: [
                { title: "Radir Siap", url: "/agenda-siap/radir" },
                { title: "Rakordir Siap", url: "/agenda-siap/rakordir" },
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
                {/* ✅ TeamSwitcher perlu diupdate untuk menerima string path logo.
                  Saya tetap menggunakan TeamSwitcher agar fitur menu dropdown tim tetap ada.
                */}
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
    loading: () => <div className="w-(--sidebar-width) bg-sidebar border-r flex flex-col h-screen" />
})