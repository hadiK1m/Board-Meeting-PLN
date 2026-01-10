"use client"

import * as React from "react"
import Image from "next/image" // ✅ Import Image Next.js
import { ChevronsUpDown, Plus } from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function TeamSwitcher({
    teams,
}: {
    teams: {
        name: string
        // ✅ Diubah agar bisa menerima Komponen Icon atau string path gambar
        logo: React.ElementType | string
        plan: string
    }[]
}) {
    const { isMobile } = useSidebar()
    const [activeTeam, setActiveTeam] = React.useState(teams[0])

    if (!activeTeam) {
        return null
    }

    // Helper untuk merender logo secara dinamis
    const renderLogo = (logo: React.ElementType | string, className: string) => {
        if (typeof logo === "string") {
            return (
                <Image
                    src={logo}
                    alt="Logo"
                    width={24}
                    height={24}
                    className={`${className} object-contain`}
                />
            )
        }
        const Icon = logo
        return <Icon className={className} />
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            {/* Container Logo Utama */}
                            <div className="bg-white flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm">
                                {renderLogo(activeTeam.logo, "size-5")}
                            </div>

                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold text-[#125d72]">
                                    {activeTeam.name}
                                </span>
                                <span className="truncate text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    {activeTeam.plan}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 opacity-50" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border-none shadow-2xl"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-[10px] uppercase tracking-widest px-3 py-2">
                            Unit / Organisasi
                        </DropdownMenuLabel>
                        {teams.map((team, index) => (
                            <DropdownMenuItem
                                key={team.name}
                                onClick={() => setActiveTeam(team)}
                                className="gap-3 p-3 cursor-pointer focus:bg-slate-50 rounded-lg transition-colors"
                            >
                                <div className="flex size-8 items-center justify-center rounded-md border bg-white shadow-sm shrink-0 overflow-hidden">
                                    {renderLogo(team.logo, "size-5")}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-[#125d72]">{team.name}</span>
                                    <span className="text-[10px] text-slate-400">{team.plan}</span>
                                </div>
                                <DropdownMenuShortcut className="font-mono text-[10px]">
                                    ⌘{index + 1}
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="bg-slate-100" />
                        <DropdownMenuItem className="gap-3 p-3 cursor-pointer rounded-lg text-slate-500 hover:text-[#14a2ba]">
                            <div className="flex size-8 items-center justify-center rounded-md border-2 border-dashed bg-transparent shrink-0">
                                <Plus className="size-4" />
                            </div>
                            <div className="text-sm font-semibold">Tambah Unit Baru</div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}