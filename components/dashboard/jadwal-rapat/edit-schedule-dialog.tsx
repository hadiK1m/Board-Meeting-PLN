"use client"

import { useState, useEffect } from "react"
import { Clock, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ✅ Penyesuaian Import: Menggunakan upsertMeetingScheduleAction dari meeting-actions.ts
import { upsertMeetingScheduleAction } from "@/server/actions/meeting-actions"
import { AgendaReady } from "./jadwal-rapat-client"

interface EditScheduleDialogProps {
    agenda: AgendaReady | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditScheduleDialog({ agenda, open, onOpenChange }: EditScheduleDialogProps) {
    const [date, setDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("Selesai")
    const [isManualTime, setIsManualTime] = useState(false)
    const [method, setMethod] = useState("OFFLINE")
    const [location, setLocation] = useState("")
    const [link, setLink] = useState("")
    const [isPending, setIsPending] = useState(false)

    // ✅ Sinkronisasi Reaktif saat modal dibuka
    useEffect(() => {
        if (open && agenda) {
            setDate(agenda.executionDate || "")
            setStartTime(agenda.startTime || "")
            setEndTime(agenda.endTime || "Selesai")
            setIsManualTime(agenda.endTime !== "Selesai" && agenda.endTime !== null)
            setMethod(agenda.meetingMethod || "OFFLINE")
            setLocation(agenda.meetingLocation || "")
            setLink(agenda.meetingLink || "")
        }
    }, [agenda, open])

    const toggleEndTimeMode = () => {
        if (!isManualTime) {
            setEndTime("")
            setIsManualTime(true)
        } else {
            setEndTime("Selesai")
            setIsManualTime(false)
        }
    }

    const handleUpdate = async () => {
        if (!agenda || !date || !startTime) {
            toast.error("Mohon lengkapi data jadwal utama")
            return
        }

        setIsPending(true)
        try {
            // ✅ Menggunakan upsertMeetingScheduleAction untuk memperbarui jadwal
            const res = await upsertMeetingScheduleAction({
                id: agenda.id,
                executionDate: date,
                startTime,
                endTime: endTime || "Selesai",
                meetingMethod: method,
                location: location,
                link: link
            })

            if (res.success) {
                toast.success("Jadwal Berhasil Diperbarui")
                onOpenChange(false)
            } else {
                toast.error(res.error || "Gagal memperbarui jadwal")
            }
        } catch (err) {
            console.error(err)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-[#125d72] font-bold text-xl uppercase tracking-tight">
                        Edit Jadwal Rapat
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-5 mt-4">
                    <div className="col-span-2 p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agenda Rapat:</p>
                        <p className="text-sm font-black text-[#125d72] uppercase mt-1 leading-tight">{agenda?.title}</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Tanggal Pelaksanaan</Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 focus:ring-[#14a2ba]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Mulai</Label>
                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 focus:ring-[#14a2ba]" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Selesai</Label>
                            <div className="relative group">
                                <Input
                                    type={isManualTime ? "time" : "text"}
                                    value={endTime}
                                    readOnly={!isManualTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className={cn("h-11 pr-10 font-semibold transition-all", !isManualTime && "bg-slate-50 text-slate-500 cursor-not-allowed border-dashed")}
                                />
                                <button type="button" onClick={toggleEndTimeMode} className={cn("absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors", isManualTime ? "text-[#14a2ba] bg-blue-50" : "text-slate-400 hover:text-[#125d72]")}>
                                    {isManualTime ? <RotateCcw className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 space-y-2">
                        <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Metode Rapat</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger className="h-11 focus:ring-[#14a2ba]"><SelectValue placeholder="Pilih Metode" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OFFLINE">OFFLINE (Tatap Muka)</SelectItem>
                                <SelectItem value="ONLINE">ONLINE (Virtual / Zoom)</SelectItem>
                                <SelectItem value="HYBRID">HYBRID (Campuran)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {(method === "OFFLINE" || method === "HYBRID") && (
                        <div className="col-span-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Lokasi Ruangan / Tempat</Label>
                            <Input className="h-11 focus:ring-[#14a2ba]" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Masukkan nama ruangan..." />
                        </div>
                    )}

                    {(method === "ONLINE" || method === "HYBRID") && (
                        <div className="col-span-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Tautan / Link Meeting</Label>
                            <Input className="h-11 focus:ring-[#14a2ba]" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://zoom.us/j/..." />
                        </div>
                    )}

                    <div className="col-span-2 pt-4 flex gap-3">
                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="flex-1 h-12 font-bold text-slate-500">Batal</Button>
                        <Button onClick={handleUpdate} disabled={isPending} className="flex-2 bg-[#125d72] hover:bg-[#05252b] text-white font-extrabold h-12 shadow-lg active:scale-95 transition-all">
                            {isPending ? "Menyimpan..." : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-4 w-4" /> Simpan Perubahan Jadwal
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}