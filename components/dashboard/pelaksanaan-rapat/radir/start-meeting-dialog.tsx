/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Play, X, Search } from "lucide-react"

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

interface StartMeetingDialogProps {
    readyAgendas: Agenda[]
}

export function StartMeetingDialog({ readyAgendas }: StartMeetingDialogProps) {
    const router = useRouter()

    // --- State ---
    const [open, setOpen] = React.useState(false)
    const [comboboxOpen, setComboboxOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [meetingNumber, setMeetingNumber] = React.useState("")
    const [meetingYear, setMeetingYear] = React.useState(new Date().getFullYear().toString())

    // --- Effects ---
    // Reset form saat dialog ditutup/dibuka
    React.useEffect(() => {
        if (!open) {
            setSelectedIds([])
            setMeetingNumber("")
            setMeetingYear(new Date().getFullYear().toString())
            setIsLoading(false)
        }
    }, [open])

    // --- Handlers ---
    const toggleAgenda = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    const validateForm = () => {
        if (selectedIds.length === 0) {
            toast.error("Pilih setidaknya satu agenda sidang.")
            return false
        }
        if (!meetingNumber.trim()) {
            toast.error("Nomor Risalah wajib diisi.")
            return false
        }
        if (!/^\d{4}$/.test(meetingYear)) {
            toast.error("Tahun harus berupa 4 digit angka.")
            return false
        }
        return true
    }

    const handleStartMeeting = () => {
        if (!validateForm()) return

        setIsLoading(true)

        const today = format(new Date(), "dd MMMM yyyy", { locale: id })
        const defaultTitle = `Sesi Risalah RADIR - ${today}`

        // Menggunakan URLSearchParams agar lebih rapi
        const params = new URLSearchParams({
            ids: selectedIds.join(","),
            title: defaultTitle,
            number: meetingNumber.trim(),
            year: meetingYear,
            // mNo & mYear ditambahkan jika backend memerlukannya secara spesifik
            mNo: meetingNumber.trim(),
            mYear: meetingYear
        })

        router.push(`/pelaksanaan-rapat/radir/live?${params.toString()}`)
        setOpen(false)
    }

    const selectedAgendas = readyAgendas.filter((a) => selectedIds.includes(a.id))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#125d72] hover:bg-[#0e4b5d] font-bold uppercase tracking-wider gap-2 shadow-lg transition-all active:scale-95">
                    <Play className="h-4 w-4 fill-current" /> BUAT RISALAH BARU
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="px-8 pt-8 pb-4 bg-white">
                    <DialogTitle className="text-2xl font-black text-[#125d72] tracking-tight">
                        Konfigurasi Risalah
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        Input detail risalah dan pilih agenda yang siap disidangkan.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-8 py-4 space-y-6 bg-white">
                    {/* Input Group: Risalah & Tahun */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="m_num" className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Nomor Risalah</Label>
                            <Input
                                id="m_num"
                                placeholder="001"
                                value={meetingNumber}
                                onChange={(e) => setMeetingNumber(e.target.value)}
                                className="rounded-xl border-slate-200 focus:border-[#125d72] focus:ring-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="m_year" className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Tahun</Label>
                            <Input
                                id="m_year"
                                value={meetingYear}
                                onChange={(e) => setMeetingYear(e.target.value)}
                                className="rounded-xl border-slate-200 focus:border-[#125d72] focus:ring-0"
                            />
                        </div>
                    </div>

                    {/* Combobox: Pilih Agenda */}
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Daftar Agenda</Label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between rounded-xl border-slate-200 h-12 text-left font-normal hover:bg-slate-50"
                                >
                                    <span className="truncate">
                                        {selectedIds.length > 0
                                            ? `${selectedIds.length} Agenda dipilih`
                                            : "Klik untuk memilih agenda..."}
                                    </span>
                                    <ChevronsUpDown className="h-4 w-4 opacity-30" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-(--radix-popover-trigger-width) p-0 rounded-2xl shadow-2xl border-slate-100" align="start">
                                <Command className="rounded-2xl">
                                    <CommandInput placeholder="Cari judul agenda..." />
                                    <CommandList className="max-h-64">
                                        <CommandEmpty className="p-4 text-xs italic text-center text-slate-400">
                                            Tidak ada agenda yang siap sidang.
                                        </CommandEmpty>
                                        <CommandGroup className="p-2">
                                            {readyAgendas.map((agenda) => (
                                                <CommandItem
                                                    key={agenda.id}
                                                    onSelect={() => toggleAgenda(agenda.id)}
                                                    className="rounded-lg py-3 cursor-pointer mb-1 last:mb-0"
                                                >
                                                    <div className={cn(
                                                        "mr-3 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                                                        selectedIds.includes(agenda.id)
                                                            ? "bg-[#125d72] border-[#125d72] text-white"
                                                            : "border-slate-200"
                                                    )}>
                                                        <Check className={cn("h-3 w-3", selectedIds.includes(agenda.id) ? "opacity-100" : "opacity-0")} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-slate-700 text-sm truncate">{agenda.title}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{agenda.director}</span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Selected Badges Section */}
                    {selectedAgendas.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                            {selectedAgendas.map((agenda) => (
                                <Badge
                                    key={agenda.id}
                                    className="bg-[#125d72]/5 hover:bg-[#125d72]/10 text-[#125d72] border-none px-3 py-1 rounded-full gap-2 transition-all"
                                >
                                    <span className="max-w-37.5 truncate text-[10px] font-bold uppercase tracking-tight">
                                        {agenda.title}
                                    </span>
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                                        onClick={() => toggleAgenda(agenda.id)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-8 py-6 bg-slate-50/80 border-t flex flex-row items-center justify-between gap-4">
                    <p className="text-[10px] text-slate-400 font-bold italic uppercase hidden sm:block">
                        *Status agenda akan berubah otomatis
                    </p>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="font-bold text-slate-400 hover:text-slate-600 uppercase text-xs tracking-widest"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleStartMeeting}
                            disabled={isLoading || selectedIds.length === 0}
                            className="bg-[#125d72] hover:bg-[#0e4b5d] px-6 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-[#125d72]/20"
                        >
                            {isLoading ? "Memproses..." : "Buka Ruang Risalah"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}