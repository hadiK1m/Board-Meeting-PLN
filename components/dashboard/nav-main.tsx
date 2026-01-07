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
import Link from "next/link" // Pastikan import Link jika menggunakan Next.js

// Definisi tipe data untuk props (sesuaikan jika berbeda)
interface NavItem {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: { // Submenu bersifat opsional
        title: string
        url: string
    }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
    // 1. PERBAIKAN STATE: Lazy Initialization
    // Membaca localStorage langsung saat inisialisasi state, bukan di useEffect
    const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
        // Cek apakah kode berjalan di browser (penting untuk Next.js)
        if (typeof window !== "undefined") {
            const savedState = localStorage.getItem("sidebar-menu-state")
            if (savedState) {
                return JSON.parse(savedState)
            }
        }
        return {} // Default jika tidak ada save
    })

    // Effect hanya untuk MENYIMPAN perubahan ke localStorage
    useEffect(() => {
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
                    // 2. LOGIKA UI: Cek apakah item punya submenu
                    const hasSubmenu = item.items && item.items.length > 0

                    // JIKA TIDAK ADA SUBMENU (Contoh: Dashboard, Jadwal Rapat)
                    // Render link biasa tanpa panah/collapsible
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

                    // JIKA ADA SUBMENU
                    // Render dengan Collapsible dan Panah
                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            open={openStates[item.title]} // Menggunakan state dari localStorage
                            onOpenChange={() => toggleOpen(item.title)}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        {/* Tanda panah hanya muncul di sini */}
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