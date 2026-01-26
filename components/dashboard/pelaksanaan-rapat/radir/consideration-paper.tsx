"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ConsiderationPaperProps {
    children: React.ReactNode
    onClick?: () => void
}

export function ConsiderationPaper({ children, onClick }: ConsiderationPaperProps) {
    return (
        <div
            className="bg-[#F0F2F5] p-4 md:p-8 flex-1 flex justify-center items-start overflow-y-auto cursor-text min-h-[calc(100vh-200px)]"
            onClick={onClick}
        >
            {/* --- THE PAPER --- */}
            <div
                className={cn(
                    "bg-white w-full max-w-212.5 min-h-264",
                    "shadow-sm border border-[#e1e3e6]",
                    "relative transition-all duration-300",
                    "px-12 py-16 md:px-24 md:py-24"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-0.5">
                    {children}
                </div>
            </div>
        </div>
    )
}