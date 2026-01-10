import React from "react"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { agendas } from "@/db/schema/agendas"
import { inArray } from "drizzle-orm"
import { BulkMeetingClient } from "@/components/dashboard/pelaksanaan-rapat/radir/bulk-meeting-client"

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LiveMeetingPage({ searchParams }: PageProps) {
    // Await searchParams karena di Next.js 15+ ini async
    const params = await searchParams

    const idsString = params.ids as string
    const meetingTitle = (params.title as string) || "Risalah Rapat"

    // Ambil nomor dan tahun dari query params (dari dialog)
    const initialMeetingNumber = params.number as string | undefined
    const initialMeetingYear = params.year as string | undefined

    if (!idsString) {
        redirect("/pelaksanaan-rapat/radir")
    }

    const ids = idsString.split(",")

    // Ambil detail lengkap semua agenda yang dipilih
    const selectedAgendas = await db.query.agendas.findMany({
        where: inArray(agendas.id, ids),
    })

    if (selectedAgendas.length === 0) {
        return <div>Data agenda tidak ditemukan.</div>
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
            {/* Wrapper Client Component yang menghandle state antar agenda */}
            <BulkMeetingClient
                agendas={selectedAgendas}
                meetingTitle={meetingTitle}
                initialMeetingNumber={initialMeetingNumber} // ← Dikirim ke client
                initialMeetingYear={initialMeetingYear}     // ← Dikirim ke client
            />
        </div>
    )
}