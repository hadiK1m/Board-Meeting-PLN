/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { inArray, and, eq } from "drizzle-orm"
import { BulkMeetingClient } from "@/components/dashboard/pelaksanaan-rapat/radir/bulk-meeting-client"
import LiveTour from "@/components/dashboard/pelaksanaan-rapat/radir/live-tour"

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LiveMeetingPage({ searchParams }: PageProps) {
    const params = await searchParams

    const idsString = params.ids as string | undefined
    const meetingTitle = (params.title as string) || "Risalah Rapat"
    const initialMeetingNumber = params.number as string | undefined
    const initialMeetingYear = params.year as string | undefined

    let selectedAgendas: any[] = []

    // LOGIKA 1: Jika mengklik "Kelola Sesi Rapat" (berdasarkan nomor & tahun)
    if (initialMeetingNumber && initialMeetingYear && !idsString) {
        selectedAgendas = await db.query.agendas.findMany({
            where: and(
                eq(agendas.meetingNumber, initialMeetingNumber),
                eq(agendas.meetingYear, initialMeetingYear)
            ),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)]
        })
    }
    // LOGIKA 2: Jika mengklik "Mulai Rapat Baru" (berdasarkan ID yang dipilih)
    else if (idsString) {
        const ids = idsString.split(",")
        selectedAgendas = await db.query.agendas.findMany({
            where: inArray(agendas.id, ids),
            orderBy: (agendas, { asc }) => [asc(agendas.createdAt)]
        })
    }
    // JIKA TIDAK ADA PARAMETER SAMA SEKALI
    else {
        redirect("/pelaksanaan-rapat/radir")
    }

    if (selectedAgendas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-slate-500 font-bold">Data agenda tidak ditemukan untuk sesi ini.</p>
                <a href="/pelaksanaan-rapat/radir" className="text-blue-600 underline">Kembali ke Daftar</a>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
            <LiveTour />
            <BulkMeetingClient
                agendas={selectedAgendas}
                meetingTitle={meetingTitle}
                initialMeetingNumber={initialMeetingNumber}
                initialMeetingYear={initialMeetingYear}
            />
        </div>
    )
}