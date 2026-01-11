/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Play, X, Loader2 } from "lucide-react"

import { Agenda } from "@/db/schema/agendas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface StartRakordirDialogProps {
    readyAgendas: Agenda[]
}

export function StartRakordirDialog({ readyAgendas }: StartRakordirDialogProps) {
    const router = useRouter()

    // --- State ---
    const [open, setOpen] = React.useState(false)
    const [comboboxOpen, setComboboxOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [meetingYear, setMeetingYear] = React.useState(new Date().getFullYear().toString())

    // Reset form saat dialog ditutup/dibuka
    React.useEffect(() => {
        if (!open) {
            setSelectedIds([])
            setMeetingYear(new Date().getFullYear().toString())
            setIsLoading(false)
        }
    }, [open])

    // --- Logika Generate Nomor Otomatis ---
    const generateAutoNumber = () => {
        const now = new Date()
        const timePart = format(now, "HHmm") // Jam & Menit
        const randomPart = Math.floor(100 + Math.random() * 900) // 3 Digit Random
        return `${timePart}${randomPart}` // Hasil: misal 1430821
    }

    // --- Handlers ---
    const toggleAgenda = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    const handleStartMeeting = () => {
        if (selectedIds.length === 0) {
            toast.error("Silakan pilih setidaknya satu agenda Rakordir.")
            return
        }

        setIsLoading(true)

        // Generate nomor rapat unik untuk grup ini
        const uniqueNumber = generateAutoNumber()

        const params = new URLSearchParams({
            ids: selectedIds.join(","),
            number: uniqueNumber, // Nomor otomatis yang sama dikirim ke semua agenda terpilih
            year: meetingYear,
        })

        toast.success(`ID Rapat Berhasil Dibuat: #${uniqueNumber}`)

        // Arahkan ke halaman live dengan parameter lengkap
        router.push(`/pelaksanaan-rapat/rakordir/live?${params.toString()}`)
        setOpen(false)
    }

    const selectedAgendas = readyAgendas.filter((a) => selectedIds.includes(a.id))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#14a2ba] hover:bg-[#125d72] font-black uppercase tracking-widest gap-2 shadow-lg transition-all active:scale-95 h-11 px-6 rounded-xl text-[10px] text-white">
                    <Play className="h-4 w-4 fill-current" /> BUAT NOTULENSI BARU
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <DialogHeader className="px-8 pt-8 pb-4 bg-white">
                    <DialogTitle className="text-2xl font-black text-[#125d72] tracking-tight uppercase">
                        Konfigurasi Rakordir
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        Nomor rapat akan di-generate otomatis oleh sistem.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-8 py-4 space-y-6 bg-white">
                    {/* Input Tahun */}
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tahun Pelaksanaan</Label>
                        <Input
                            placeholder="2026"
                            value={meetingYear}
                            onChange={(e) => setMeetingYear(e.target.value)}
                            className="rounded-xl border-slate-200 focus:border-[#14a2ba] focus:ring-0 font-bold h-11"
                        />
                    </div>

                    {/* Pilih Agenda (Multi-select) */}
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Pilih Materi Pembahasan</Label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between rounded-xl border-slate-200 h-12 text-left font-bold hover:bg-slate-50 transition-colors"
                                >
                                    <span className="truncate text-slate-600">
                                        {selectedIds.length > 0
                                            ? `${selectedIds.length} Agenda dipilih`
                                            : "Klik untuk memilih materi..."}
                                    </span>
                                    <ChevronsUpDown className="h-4 w-4 opacity-30" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl border-slate-100" align="start">
                                <Command className="rounded-2xl">
                                    <CommandInput placeholder="Cari judul materi..." className="h-12" />
                                    <CommandList className="max-h-64">
                                        <CommandEmpty className="p-4 text-xs italic text-center font-bold text-slate-400">
                                            Tidak ada agenda Rakordir yang dijadwalkan.
                                        </CommandEmpty>
                                        <CommandGroup className="p-2">
                                            {readyAgendas.map((agenda) => (
                                                <CommandItem
                                                    key={agenda.id}
                                                    onSelect={() => toggleAgenda(agenda.id)}
                                                    className="rounded-lg py-3 mb-1 cursor-pointer hover:bg-slate-50"
                                                >
                                                    <div className={cn(
                                                        "mr-3 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                                                        selectedIds.includes(agenda.id)
                                                            ? "bg-[#14a2ba] border-[#14a2ba] text-white"
                                                            : "border-slate-200"
                                                    )}>
                                                        <Check className={cn("h-3 w-3", selectedIds.includes(agenda.id) ? "opacity-100" : "opacity-0")} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-black text-slate-700 text-xs truncate uppercase tracking-tight">{agenda.title}</span>
                                                        <span className="text-[9px] text-[#14a2ba] font-bold uppercase italic">{agenda.initiator}</span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Badge Preview */}
                    {selectedAgendas.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {selectedAgendas.map((agenda) => (
                                <Badge
                                    key={agenda.id}
                                    className="bg-[#14a2ba]/10 text-[#125d72] border-none px-3 py-1 rounded-full gap-2 flex items-center animate-in fade-in zoom-in-95"
                                >
                                    <span className="max-w-[150px] truncate text-[9px] font-black uppercase tracking-tight">
                                        {agenda.title}
                                    </span>
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
                                        onClick={() => toggleAgenda(agenda.id)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-8 py-6 bg-slate-50/80 border-t flex flex-row items-center justify-between gap-4">
                    <p className="text-[9px] text-slate-400 font-black italic uppercase hidden sm:block">
                        *Satu ID unik akan diberikan ke grup ini
                    </p>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="font-black text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleStartMeeting}
                            disabled={isLoading || selectedIds.length === 0}
                            className="bg-[#125d72] hover:bg-[#0e4b5d] px-8 rounded-xl font-black uppercase text-[10px] tracking-widest text-white h-11 shadow-lg shadow-[#125d72]/20"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Buka Ruang Notulensi"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}