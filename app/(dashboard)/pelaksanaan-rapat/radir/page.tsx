"use client"

import React, { useState, useEffect } from "react"
import {
    Presentation,
    LayoutGrid,
    List,
    Loader2,
    RefreshCcw,
    AlertCircle
} from "lucide-react"
import { RadirListView } from "@/components/dashboard/pelaksanaan-rapat/radir/radir-list-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StartMeetingDialog } from "@/components/dashboard/pelaksanaan-rapat/radir/start-meeting-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getRadirMonitoringData } from "@/server/actions/meeting-actions"
import { Agenda } from "@/db/schema/agendas"

interface GroupedMeeting {
    groupKey: string
    meetingNumber: string
    meetingYear: string
    executionDate: string | null
    startTime: string | null
    endTime: string | null
    location: string | null
    status: string
    agendas: Agenda[]
}

export default function PelaksanaanRadirPage() {
    const [mounted, setMounted] = useState(false)
    const [groupedMeetings, setGroupedMeetings] = useState<GroupedMeeting[]>([])
    const [readyAgendas, setReadyAgendas] = useState<Agenda[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setMounted(true)
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const result = await getRadirMonitoringData()
            console.log("Data Received:", result) // Debugging: Cek di console browser

            if (result.success) {
                setGroupedMeetings(result.groupedMeetings as GroupedMeeting[])
                setReadyAgendas(result.readyAgendas as Agenda[])
            }
        } catch (err) {
            console.error("Gagal memuat data monitoring:", err)
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/50 min-h-screen" suppressHydrationWarning>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#125d72] rounded-xl shadow-lg">
                        <Presentation className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-[#125d72] uppercase">
                            Monitoring Rapat Radir
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-bold italic uppercase opacity-70">
                            Monitoring Pelaksanaan Rapat Per Nomor Meeting
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
                    >
                        <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                    {/* Pastikan Dialog menerima data readyAgendas */}
                    <StartMeetingDialog readyAgendas={readyAgendas} />
                </div>
            </div>

            <hr className="border-slate-200" />

            <Tabs defaultValue="table" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-200/50 p-1 border rounded-xl">
                        <TabsTrigger value="table" className="flex items-center gap-2 data-[state=active]:bg-white rounded-lg transition-all">
                            <List className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Table View</span>
                        </TabsTrigger>
                        <TabsTrigger value="grid" className="flex items-center gap-2 data-[state=active]:bg-white rounded-lg transition-all">
                            <LayoutGrid className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Grid View</span>
                        </TabsTrigger>
                    </TabsList>

                    <div className="hidden md:block">
                        <Badge variant="outline" className="text-[10px] font-bold bg-white border-slate-200 text-[#125d72] py-1.5 px-4 rounded-lg shadow-sm">
                            {loading ? "SINKRONISASI..." : `TOTAL ${groupedMeetings.length} SESI RAPAT`}
                        </Badge>
                    </div>
                </div>

                {loading && groupedMeetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-dashed border-slate-200">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Memproses Data...</p>
                    </div>
                ) : groupedMeetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-dashed border-slate-300">
                        <AlertCircle className="h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-xs text-slate-400 font-bold uppercase">Belum ada data rapat yang tersimpan</p>
                        <p className="text-[10px] text-slate-400">Silakan jadwalkan atau mulai rapat baru.</p>
                    </div>
                ) : (
                    <>
                        <TabsContent value="table" className="mt-0 outline-none">
                            <RadirListView initialData={groupedMeetings} viewMode="table" />
                        </TabsContent>
                        <TabsContent value="grid" className="mt-0 outline-none">
                            <RadirListView initialData={groupedMeetings} viewMode="grid" />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    )
}