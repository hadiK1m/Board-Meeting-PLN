/* eslint-disable react-hooks/set-state-in-effect */
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
    const [isClient, setIsClient] = useState(false)
    const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
        // ✅ PERBAIKAN: Initialize dengan default, bukan membaca localStorage
        const defaultStates: Record<string, boolean> = {}
        items.forEach(item => {
            if (item.items?.length) {
                defaultStates[item.title] = false
            }
        })
        return defaultStates
    })

    // ✅ PERBAIKAN: Load dari localStorage hanya sekali setelah mount
    useEffect(() => {
        setIsClient(true)

        // Gunakan setTimeout untuk menghindari synchronous state update
        const timer = setTimeout(() => {
            const saved = localStorage.getItem("sidebar-menu-state")
            if (saved) {
                try {
                    const parsedState = JSON.parse(saved)
                    setOpenStates(prev => ({
                        ...prev,
                        ...parsedState // Merge dengan default, jangan replace seluruhnya
                    }))
                } catch (error) {
                    console.error("Error parsing sidebar state:", error)
                }
            }
        }, 0) // setTimeout dengan 0 delay untuk membuatnya async

        return () => clearTimeout(timer)
    }, []) // ✅ Empty dependency array - hanya sekali setelah mount

    // ✅ PERBAIKAN: Simpan ke localStorage dengan useEffect terpisah
    useEffect(() => {
        if (!isClient || Object.keys(openStates).length === 0) return

        const timer = setTimeout(() => {
            localStorage.setItem("sidebar-menu-state", JSON.stringify(openStates))
        }, 300) // Debounce 300ms untuk menghindari write berulang

        return () => clearTimeout(timer)
    }, [openStates, isClient])

    const toggleOpen = (title: string) => {
        setOpenStates(prev => ({
            ...prev,
            [title]: !prev[title]
        }))
    }

    // Render untuk SSR
    if (!isClient) {
        return (
            <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                {item.items && item.items.length > 0 && (
                                    <ChevronRight className="ml-auto" />
                                )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        )
    }

    // Render untuk client
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const hasSubmenu = item.items && item.items.length > 0

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

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            open={openStates[item.title] || false}
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