/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React from "react"
import { Button } from "@/components/ui/button"

export default function TourTriggerButton() {
    const handleClick = () => {
        // Dispatch custom event to trigger onboarding tour
        try {
            window.dispatchEvent(new Event("bm:tour:start"))
        } catch (e) {
            // fallback: set query param to force tour on reload
            const url = new URL(window.location.href)
            url.searchParams.set("tour", "1")
            window.location.href = url.toString()
        }
    }

    return (
        <Button
            onClick={handleClick}
            className="ml-auto hidden md:inline-flex h-9 rounded-xl text-sm font-black px-4 bg-[#125d72] hover:bg-[#0e4b5d] text-white shadow-lg transition-colors"
            title="Mulai tour untuk pemula"
        >
            Mulai tour untuk pemula
        </Button>
    )
}