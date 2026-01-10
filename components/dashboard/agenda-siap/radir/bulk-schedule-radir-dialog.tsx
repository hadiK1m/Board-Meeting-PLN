"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Select, { MultiValue } from "react-select"
import {
    CalendarPlus,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Link as LinkIcon,
    RotateCcw,
    Save,
    Info,
    Layers
} from "lucide-react"
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
    Select as ShadcnSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { upsertMeetingScheduleAction } from "@/server/actions/meeting-actions"
import { type AgendaReady } from "./radir-siap-client"

interface AgendaOption {
    value: string;
    label: string;
    initiator: string;
}

interface BulkScheduleRadirDialogProps {
    selectedAgendas: AgendaReady[]
    onSuccess?: () => void
}

export function BulkScheduleRadirDialog({ selectedAgendas, onSuccess }: BulkScheduleRadirDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    // Form State
    const [date, setDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("Selesai")
    const [isManualTime, setIsManualTime] = useState(false)
    const [method, setMethod] = useState("OFFLINE")
    const [location, setLocation] = useState("")
    const [link, setLink] = useState("")

    // ✅ Sync Data yang dipilih: Menggunakan useMemo agar reaktif dan bersih dari error unused useEffect
    const selectedOptions: MultiValue<AgendaOption> = useMemo(() => {
        return selectedAgendas.map(a => ({
            value: a.id,
            label: a.title,
            initiator: a.initiator || "-"
        }))
    }, [selectedAgendas])

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) router.refresh()
        setOpen(newOpen)
    }

    const toggleEndTimeMode = () => {
        if (!isManualTime) {
            setEndTime("")
            setIsManualTime(true)
        } else {
            setEndTime("Selesai")
            setIsManualTime(false)
        }
    }

    const handleSubmit = async () => {
        if (selectedOptions.length === 0 || !date || !startTime) {
            toast.error("Mohon lengkapi Agenda, Tanggal, dan Jam Mulai");
            return;
        }

        setIsPending(true)

        try {
            const results = await Promise.all(
                selectedOptions.map(option =>
                    upsertMeetingScheduleAction({
                        id: option.value,
                        executionDate: date,
                        startTime,
                        endTime: endTime || "Selesai",
                        meetingMethod: method,
                        location: location,
                        link: link
                    })
                )
            )

            const isAllSuccess = results.every(r => r.success)

            if (isAllSuccess) {
                // ✅ FIX: Menghapus parameter 't' yang tidak terpakai
                toast.custom(() => (
                    <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-2xl border border-emerald-100 min-w-87.5 animate-in slide-in-from-bottom-5">
                        <div className="bg-[#125d72] p-2 rounded-lg shrink-0 shadow-lg">
                            <Image
                                src="/logo-pln.png"
                                alt="PLN"
                                width={24}
                                height={30}
                                className="object-contain"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] font-black text-[#125d72] uppercase tracking-[0.2em]">Sistem Board Meeting</p>
                            <p className="text-sm font-bold text-slate-800 leading-tight">Berhasil Ditetapkan!</p>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {selectedOptions.length} Agenda telah dijadwalkan secara resmi.
                            </p>
                        </div>
                    </div>
                ), { duration: 4000 });

                setOpen(false);
                if (onSuccess) onSuccess();
                router.refresh();
            } else {
                toast.error("Gagal memperbarui beberapa agenda.");
            }
        } catch (err) {
            console.error("Bulk Schedule Error:", err)
            toast.error("Terjadi kesalahan sistem.");
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="bg-[#125d72] hover:bg-[#05252b] text-white font-bold shadow-lg transition-all active:scale-95 h-10 px-4 rounded-xl">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Jadwalkan Agenda ({selectedAgendas.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl border-none shadow-2xl overflow-visible">
                <DialogHeader>
                    <DialogTitle className="text-[#125d72] font-extrabold text-2xl flex items-center gap-2 uppercase tracking-tight">
                        <Layers className="h-6 w-6 text-[#14a2ba]" />
                        Penetapan Jadwal Massal
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-5 mt-4">
                    <div className="col-span-2 space-y-2">
                        <Label className="text-[#125d72] font-bold flex justify-between items-center text-xs uppercase tracking-wider">
                            <span className="flex items-center gap-2"><Info className="h-3.5 w-3.5 text-[#14a2ba]" /> Agenda Terpilih</span>
                        </Label>
                        <Select
                            isMulti
                            isDisabled
                            value={selectedOptions}
                            placeholder="Data agenda..."
                            className="text-sm"
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderRadius: '0.75rem',
                                    padding: '4px',
                                    borderColor: '#e2e8f0',
                                    backgroundColor: '#f1f5f9',
                                }),
                                multiValue: (base) => ({
                                    ...base,
                                    backgroundColor: '#e7f6f9',
                                    borderRadius: '6px',
                                }),
                                multiValueLabel: (base) => ({
                                    ...base,
                                    color: '#125d72',
                                    fontWeight: 'bold',
                                    fontSize: '10px',
                                }),
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Tanggal Pelaksanaan</Label>
                        <div className="relative">
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 pl-10 focus-visible:ring-[#14a2ba] rounded-xl" />
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Mulai</Label>
                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 focus-visible:ring-[#14a2ba] rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Selesai</Label>
                            <div className="relative">
                                <Input
                                    type={isManualTime ? "time" : "text"}
                                    value={endTime}
                                    readOnly={!isManualTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className={cn("h-11 pr-10 font-semibold transition-all rounded-xl", !isManualTime && "bg-slate-100 text-slate-500 border-dashed")}
                                />
                                <button type="button" onClick={toggleEndTimeMode} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#125d72]">
                                    {isManualTime ? <RotateCcw className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 space-y-2">
                        <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Metode Rapat</Label>
                        <ShadcnSelect value={method} onValueChange={setMethod}>
                            <SelectTrigger className="h-11 focus:ring-[#14a2ba] rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OFFLINE">OFFLINE (Tatap Muka)</SelectItem>
                                <SelectItem value="ONLINE">ONLINE (Virtual / Zoom)</SelectItem>
                                <SelectItem value="HYBRID">HYBRID (Campuran)</SelectItem>
                            </SelectContent>
                        </ShadcnSelect>
                    </div>

                    {(method === "OFFLINE" || method === "HYBRID") && (
                        <div className="col-span-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Lokasi Ruangan</Label>
                            <div className="relative">
                                <Input placeholder="Contoh: Ruang Rapat Lt. 3" className="h-11 pl-10 focus-visible:ring-[#14a2ba] rounded-xl" value={location} onChange={(e) => setLocation(e.target.value)} />
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                    )}

                    {(method === "ONLINE" || method === "HYBRID") && (
                        <div className="col-span-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[#125d72] font-bold text-xs uppercase tracking-wider">Tautan / Link Meeting</Label>
                            <div className="relative">
                                <Input placeholder="https://zoom.us/j/..." className="h-11 pl-10 focus-visible:ring-[#14a2ba] rounded-xl" value={link} onChange={(e) => setLink(e.target.value)} />
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                    )}

                    <div className="col-span-2 pt-6 flex gap-3">
                        <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="flex-1 h-12 font-bold text-slate-500 rounded-xl">Batal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex-2 bg-[#125d72] hover:bg-[#05252b] text-white font-extrabold h-12 shadow-lg active:scale-[0.98] transition-all rounded-xl"
                        >
                            {isPending ? "Memproses..." : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-4 w-4" /> Tetapkan Jadwal
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}