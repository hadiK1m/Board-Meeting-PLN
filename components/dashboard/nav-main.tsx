"use client"

import { useState, useEffect } from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

// Definisi tipe data untuk props
interface NavItem {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
        title: string
        url: string
    }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
    // ✅ PERBAIKAN: Inisialisasi state dari localStorage secara langsung di useState
    const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
        if (typeof window !== "undefined") {
            const savedState = localStorage.getItem("sidebar-menu-state")
            if (savedState) {
                return JSON.parse(savedState)
            }
        }
        return {}
    })

    // Effect untuk MENYIMPAN perubahan ke localStorage
    useEffect(() => {
        // Kita cek apakah state tidak kosong agar tidak menimpa storage saat initial render
        if (Object.keys(openStates).length > 0) {
            localStorage.setItem("sidebar-menu-state", JSON.stringify(openStates))
        }
    }, [openStates])

    const toggleOpen = (title: string) => {
        setOpenStates((prev) => ({
            ...prev,
            [title]: !prev[title],
        }))
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const hasSubmenu = item.items && item.items.length > 0

                    // 1. JIKA TIDAK ADA SUBMENU
                    if (!hasSubmenu) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild tooltip={item.title}>
                                    <Link href={item.url}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    }

                    // 2. JIKA ADA SUBMENU (Render Collapsible)
                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            // Gunakan double negation (!!) untuk memastikan nilai boolean, default false
                            open={!!openStates[item.title]}
                            onOpenChange={() => toggleOpen(item.title)}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton asChild>
                                                    <Link href={subItem.url}>
                                                        <span>{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}