"use client"

import { usePathname } from "next/navigation"
import React from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function HeaderBreadcrumb() {
    const pathname = usePathname()

    // 1. Pecah URL menjadi array segment (misal: /dashboard/jadwal-rapat -> ['dashboard', 'jadwal-rapat'])
    const segments = pathname.split("/").filter((item) => item !== "")

    // Fungsi helper untuk mengubah "jadwal-rapat" menjadi "Jadwal Rapat"
    const formatSegment = (segment: string) => {
        return segment
            .replace(/-/g, " ") // Ganti strip dengan spasi
            .replace(/\b\w/g, (char) => char.toUpperCase()) // Huruf besar di awal kata
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {/* ITEM 1: Selalu tampilkan Dashboard sebagai Home */}
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>

                {/* Loop segments URL */}
                {segments.map((segment, index) => {
                    // Lewati jika segment adalah 'dashboard' karena sudah kita hardcode di atas
                    if (segment === "dashboard") return null

                    // Buat URL untuk segment ini (akumulasi path)
                    // Contoh: untuk 'jadwal-rapat', href-nya harus '/dashboard/jadwal-rapat'
                    const href = `/${segments.slice(0, index + 1).join("/")}`

                    // Cek apakah ini segment terakhir (halaman aktif)
                    const isLast = index === segments.length - 1

                    return (
                        <React.Fragment key={href}>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                {isLast ? (
                                    // Jika halaman terakhir: Teks tebal, bukan Link
                                    <BreadcrumbPage className="font-bold text-[#125d72]">
                                        {formatSegment(segment)}
                                    </BreadcrumbPage>
                                ) : (
                                    // Jika bukan terakhir: Link bisa diklik
                                    <span className="hidden md:block text-muted-foreground cursor-default select-text">
                                        {formatSegment(segment)}
                                    </span>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}