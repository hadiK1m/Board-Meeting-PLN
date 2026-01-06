"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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

interface SubItem {
    title: string
    url: string
}

interface NavItem {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: SubItem[]
}

export function NavMain({
    items,
}: {
    items: NavItem[]
}) {
    const pathname = usePathname()

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    // Cek apakah URL saat ini adalah bagian dari sub-item grup ini
                    const hasActiveChild = item.items?.some((subItem) => pathname === subItem.url)
                    // Cek apakah menu utama itu sendiri aktif (untuk menu tanpa sub-item)
                    const isParentActive = pathname === item.url

                    // Kondisi menu tetap terbuka jika ada anak yang aktif
                    const shouldBeOpen = item.isActive || hasActiveChild

                    // KONDISI 1: Jika menu TIDAK memiliki anak (e.g. Dashboard, Jadwal Rapat)
                    if (!item.items || item.items.length === 0) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={isParentActive}
                                >
                                    <Link href={item.url}>
                                        {item.icon && <item.icon className="size-4" />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    }

                    // KONDISI 2: Jika menu MEMILIKI anak (e.g. Usulan Agenda, Daftar Agenda Siap)
                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={shouldBeOpen}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title} isActive={hasActiveChild}>
                                        {item.icon && <item.icon className="size-4" />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={pathname === subItem.url}
                                                >
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