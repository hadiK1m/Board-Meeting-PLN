"use client"

import * as React from "react"
import {
    Command,
    LifeBuoy,
    PieChart,
    Settings2,
    Calendar,
    Gavel,
    FileText,
    Activity, // Icon untuk Monev
} from "lucide-react"

import { NavMain } from "@/components/dashboard/nav-main"
import { NavProjects } from "@/components/dashboard/nav-projects"
import { NavUser } from "@/components/dashboard/nav-user"
import { TeamSwitcher } from "@/components/dashboard/team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"

// Data Menu Aplikasi
const data = {
    user: {
        name: "Admin Sekretariat",
        email: "admin@pln.co.id",
        avatar: "/avatars/shadcn.jpg",
    },
    teams: [
        {
            name: "Board Meeting",
            logo: Command,
            plan: "PT PLN (Persero)",
        },
    ],
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: PieChart,
            items: [
                {
                    title: "Ringkasan",
                    url: "/dashboard",
                },
                {
                    title: "Jadwal Rapat",
                    url: "/jadwal-rapat",
                },
            ],
        },
        {
            title: "Usulan Agenda",
            url: "#",
            icon: FileText,
            items: [
                {
                    title: "Kepdir Sirkuler",
                    url: "/agenda/kepdir-sirkuler",
                },
                {
                    title: "Rapat Direksi (RADIR)",
                    url: "/agenda/radir",
                },
                {
                    title: "Rapat Koordinasi (RAKORDIR)",
                    url: "/agenda/rakordir",
                },
            ],
        },
        {
            title: "Agenda Siap Sidang",
            url: "#",
            icon: Calendar,
            items: [
                {
                    title: "Siap Sidang Radir",
                    url: "/agenda-siap/radir",
                },
                {
                    title: "Siap Sidang Rakordir",
                    url: "/agenda-siap/rakordir",
                },
            ],
        },
        {
            title: "Pelaksanaan Rapat",
            url: "#",
            icon: Gavel,
            items: [
                {
                    title: "Radir",
                    url: "/pelaksanaan-rapat/radir",
                },
                {
                    title: "Rakordir",
                    url: "/pelaksanaan-rapat/rakordir",
                },
            ],
        },
        // ✅ MENU BARU: MONITORING & EVALUASI
        {
            title: "Monitoring & Evaluasi",
            url: "#",
            icon: Activity,
            items: [
                {
                    title: "Monev Radir",
                    url: "/monev/radir",
                },
                {
                    title: "Monev Rakordir",
                    url: "/monev/rakordir",
                },
            ],
        },
    ],
    projects: [
        {
            name: "Pengaturan",
            url: "#",
            icon: Settings2,
        },
        {
            name: "Bantuan",
            url: "#",
            icon: LifeBuoy,
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavProjects projects={data.projects} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}