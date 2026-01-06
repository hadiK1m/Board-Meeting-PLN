"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, Clock, MapPin, Link as LinkIcon, AlertCircle, Send, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
// ✅ Import cn yang sempat tertinggal
import { cn } from "@/lib/utils"
import { scheduleAgendaAction } from "@/server/actions/agenda-actions"
import { AgendaReady } from "./jadwal-rapat-client"

export function ScheduleMeetingDialog({ availableAgendas }: { availableAgendas: AgendaReady[] }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<1 | 2>(1)
    const [selectedAgenda, setSelectedAgenda] = useState<AgendaReady | null>(null)

    // Form States
    const [date, setDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("Selesai")
    const [isManualTime, setIsManualTime] = useState(false)
    const [method, setMethod] = useState("OFFLINE")
    const [location, setLocation] = useState("")
    const [link, setLink] = useState("")
    const [isPending, setIsPending] = useState(false)

    const toggleEndTimeMode = () => {
        if (!isManualTime) {
            setEndTime("")
            setIsManualTime(true)
        } else {
            setEndTime("Selesai")
            setIsManualTime(false)
        }
    }

    const handleSchedule = async () => {
        if (!selectedAgenda || !date || !startTime) {
            toast.error("Mohon lengkapi data jadwal utama");
            return;
        }

        setIsPending(true)
        try {
            const res = await scheduleAgendaAction({
                id: selectedAgenda.id,
                executionDate: date,
                startTime,
                endTime: endTime || "Selesai",
                meetingMethod: method,
                location,
                link
            })

            if (res.success) {
                toast.success("Rapat Berhasil Dijadwalkan");
                setOpen(false);
                resetForm();
            } else {
                toast.error(res.error || "Gagal menjadwalkan rapat");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setIsPending(false)
        }
    }

    const resetForm = () => {
        setStep(1);
        setSelectedAgenda(null);
        setDate("");
        setStartTime("");
        setEndTime("Selesai");
        setIsManualTime(false);
        setMethod("OFFLINE");
        setLocation("");
        setLink("");
    }

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-bold shadow-lg gap-2 transition-all active:scale-95">
                    <CalendarIcon className="h-4 w-4" /> Jadwalkan Agenda
                </Button>
            </DialogTrigger>
            <DialogContent className={step === 1 ? "sm:max-w-xl" : "sm:max-w-2xl"}>
                <DialogHeader>
                    <DialogTitle className="text-[#125d72] font-bold text-xl flex items-center gap-2">
                        {step === 1 ? "Pilih Agenda" : "Setting Agenda (Jadwalkan Rapat)"}
                    </DialogTitle>
                </DialogHeader>

                {step === 1 ? (
                    <div className="space-y-4 mt-4">
                        <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                            <AlertCircle className="h-4 w-4" />
                            Pilih salah satu agenda yang sudah divalidasi untuk dijadwalkan
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                            {availableAgendas.length > 0 ? availableAgendas.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => { setSelectedAgenda(a); setStep(2); }}
                                    className="w-full text-left p-4 border rounded-xl hover:bg-slate-50 hover:border-[#14a2ba] transition-all group border-slate-100 flex justify-between items-center"
                                >
                                    <div>
                                        <h4 className="font-bold text-[#125d72] text-sm uppercase group-hover:text-[#14a2ba] leading-tight">{a.title}</h4>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Unit: {a.initiator}</p>
                                    </div>
                                    <Send className="h-4 w-4 text-slate-300 group-hover:text-[#14a2ba]" />
                                </button>
                            )) : (
                                <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed rounded-2xl border-slate-100">
                                    Tidak ada agenda berstatus &quot;Dapat Dilanjutkan&quot;
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-5 mt-4">
                        <div className="col-span-2 p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agenda Terpilih:</p>
                            <p className="text-sm font-black text-[#125d72] uppercase leading-tight mt-1">{selectedAgenda?.title}</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[#125d72] font-bold">Tanggal Pelaksanaan</Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 focus:ring-[#14a2ba]" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label className="text-[#125d72] font-bold">Waktu Mulai</Label>
                                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[#125d72] font-bold">Waktu Selesai</Label>
                                <div className="relative">
                                    <Input
                                        type={isManualTime ? "time" : "text"}
                                        value={endTime}
                                        readOnly={!isManualTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className={cn("h-11 pr-10 font-semibold", !isManualTime && "bg-slate-50 text-slate-500 cursor-not-allowed")}
                                    />
                                    <button
                                        type="button"
                                        onClick={toggleEndTimeMode}
                                        className={cn(
                                            "absolute right-3 top-1/2 -translate-y-1/2 transition-all p-1 rounded-md",
                                            isManualTime ? "text-[#14a2ba] bg-blue-50 hover:bg-blue-100" : "text-slate-400 hover:text-[#125d72]"
                                        )}
                                        title={isManualTime ? "Ganti ke 'Selesai'" : "Atur Jam Spesifik"}
                                    >
                                        {isManualTime ? <RotateCcw className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label className="text-[#125d72] font-bold">Metode Rapat</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OFFLINE">OFFLINE (Tatap Muka)</SelectItem>
                                    <SelectItem value="ONLINE">ONLINE (Virtual / Zoom)</SelectItem>
                                    <SelectItem value="HYBRID">HYBRID (Offline & Online)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(method === "OFFLINE" || method === "HYBRID") && (
                            <div className="col-span-2 space-y-2">
                                <Label className="text-[#125d72] font-bold">Lokasi Ruangan / Tempat</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    <Input className="pl-10 h-11" placeholder="Contoh: Ruang Rapat Lt. 3" value={location} onChange={(e) => setLocation(e.target.value)} />
                                </div>
                            </div>
                        )}

                        {(method === "ONLINE" || method === "HYBRID") && (
                            <div className="col-span-2 space-y-2">
                                <Label className="text-[#125d72] font-bold">Link Meeting Online</Label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    <Input className="pl-10 h-11" placeholder="https://zoom.us/j/..." value={link} onChange={(e) => setLink(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="col-span-2 pt-4 flex gap-3">
                            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-12 font-bold">Kembali</Button>
                            <Button
                                onClick={handleSchedule}
                                disabled={isPending}
                                className="flex-2 bg-[#125d72] hover:bg-[#05252b] text-white font-bold h-12 shadow-lg"
                            >
                                {isPending ? "Memproses..." : "Jadwalkan Rapat Sekarang"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}