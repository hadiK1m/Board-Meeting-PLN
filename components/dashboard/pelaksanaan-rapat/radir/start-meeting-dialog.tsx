"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Agenda } from "@/db/schema/agendas"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" // ← PASTIKAN DIIMPORT
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Play, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { toast } from "sonner"

interface StartMeetingDialogProps {
    readyAgendas: Agenda[]
}

export function StartMeetingDialog({ readyAgendas }: StartMeetingDialogProps) {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const [comboboxOpen, setComboboxOpen] = React.useState(false)

    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [meetingNumber, setMeetingNumber] = React.useState("")
    const [meetingYear, setMeetingYear] = React.useState(new Date().getFullYear().toString())
    const [isLoading, setIsLoading] = React.useState(false)

    // Reset form ketika dialog dibuka
    React.useEffect(() => {
        if (open) {
            setSelectedIds([])
            setMeetingNumber("")
            setMeetingYear(new Date().getFullYear().toString())
        }
    }, [open])

    const handleSelect = (currentValue: string) => {
        setSelectedIds((prev) =>
            prev.includes(currentValue)
                ? prev.filter((id) => id !== currentValue)
                : [...prev, currentValue]
        )
    }

    const handleRemove = (idToRemove: string) => {
        setSelectedIds((prev) => prev.filter((id) => id !== idToRemove))
    }

    const handleStartMeeting = () => {
        if (selectedIds.length === 0) {
            toast.error("Sila pilih sekurang-kurangnya satu agenda.")
            return
        }

        if (!meetingNumber.trim()) {
            toast.error("Nomor Risalah wajib diisi!")
            return
        }

        // Opsional: validasi tahun (4 digit)
        if (!/^\d{4}$/.test(meetingYear)) {
            toast.error("Tahun harus berupa 4 digit angka!")
            return
        }

        setIsLoading(true)

        const today = format(new Date(), "dd MMM yyyy", { locale: id })
        const defaultTitle = `Sesi Sidang RADIR - ${today}`

        const idsQuery = selectedIds.join(",")
        const titleQuery = encodeURIComponent(defaultTitle)
        const mNoQuery = encodeURIComponent(meetingNumber.trim())
        const mYearQuery = encodeURIComponent(meetingYear)

        // Redirect ke halaman live dengan semua parameter
        router.push(
            `/pelaksanaan-rapat/radir/live?ids=${idsQuery}&title=${titleQuery}&mNo=${mNoQuery}&mYear=${mYearQuery}`
        )

        setOpen(false)
        // setIsLoading(false) → tidak perlu karena page akan berubah
    }

    const selectedAgendas = readyAgendas.filter((a) => selectedIds.includes(a.id))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#125d72] hover:bg-[#0e4b5d] gap-2 shadow-md transition-all active:scale-95">
                    <Play className="h-4 w-4 fill-current" />
                    Mulai Sidang Baru
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl overflow-visible border-t-4 border-t-[#125d72]">
                <DialogHeader>
                    <DialogTitle className="text-[#125d72] font-black uppercase tracking-tight">
                        Mulai Sidang Rapat
                    </DialogTitle>
                    <DialogDescription>
                        Pilih agenda berstatus &quot;DIJADWALKAN&quot; untuk dimasukkan ke dalam sesi sidang ini.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* ── INPUT BARU: NOMOR & TAHUN RISALAH ── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="meetingNumber" className="font-bold text-[#125d72]">
                                NOMOR RISALAH
                            </Label>
                            <Input
                                id="meetingNumber"
                                placeholder="Contoh: 001 / 01"
                                value={meetingNumber}
                                onChange={(e) => setMeetingNumber(e.target.value)}
                                className="h-10 border-[#125d72]/20 focus-visible:ring-[#125d72]"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="meetingYear" className="font-bold text-[#125d72]">
                                TAHUN
                            </Label>
                            <Input
                                id="meetingYear"
                                placeholder="2026"
                                value={meetingYear}
                                onChange={(e) => setMeetingYear(e.target.value)}
                                className="h-10 border-[#125d72]/20 focus-visible:ring-[#125d72]"
                                maxLength={4}
                            />
                        </div>
                    </div>

                    {/* ── PILIHAN AGENDA (tetap sama) ── */}
                    <div className="grid gap-3">
                        <Label className="font-bold text-[#125d72] flex items-center justify-between">
                            <span>SENARAI AGENDA PILIHAN</span>
                            <Badge
                                variant="outline"
                                className="text-[#125d72] border-[#125d72]/30 bg-[#125d72]/5"
                            >
                                {selectedIds.length} Agenda Dipilih
                            </Badge>
                        </Label>

                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className={cn(
                                        "w-full justify-between h-auto min-h-11 px-3 py-2 text-left bg-white border-slate-200 hover:border-[#125d72] transition-colors",
                                        comboboxOpen && "ring-2 ring-[#125d72]/20 border-[#125d72]"
                                    )}
                                >
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        {selectedIds.length === 0 && (
                                            <span className="text-muted-foreground font-normal italic">
                                                Cari dan pilih agenda...
                                            </span>
                                        )}

                                        {selectedAgendas.map((agenda) => (
                                            <Badge
                                                key={agenda.id}
                                                variant="secondary"
                                                className="px-2 py-1 gap-1 text-[10px] font-bold border-[#125d72]/20 bg-[#125d72]/10 text-[#125d72] hover:bg-[#125d72]/20 uppercase"
                                            >
                                                <span className="truncate max-w-40">{agenda.title}</span>
                                                <div
                                                    className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-[#125d72] cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleRemove(agenda.id)
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </div>
                                            </Badge>
                                        ))}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40 text-[#125d72]" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full max-w-[min(530px,90vw)] p-0 shadow-xl border-[#125d72]/20" align="start">
                                <Command className="rounded-lg">
                                    <CommandInput placeholder="Cari tajuk agenda..." className="h-11" />
                                    <CommandList className="max-h-72">
                                        <CommandEmpty className="py-6 text-center text-sm text-slate-500">
                                            Agenda tidak ditemui.
                                        </CommandEmpty>
                                        <CommandGroup heading="Agenda Siap Sidang" className="p-2 text-[#125d72] font-bold">
                                            {readyAgendas.map((agenda) => (
                                                <CommandItem
                                                    key={agenda.id}
                                                    value={agenda.title}
                                                    onSelect={() => handleSelect(agenda.id)}
                                                    className="cursor-pointer py-3 rounded-md aria-selected:bg-[#125d72]/5"
                                                >
                                                    <div
                                                        className={cn(
                                                            "mr-3 flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                                                            selectedIds.includes(agenda.id)
                                                                ? "bg-[#125d72] border-[#125d72] text-white"
                                                                : "border-slate-300 opacity-60"
                                                        )}
                                                    >
                                                        <Check className={cn("h-3.5 w-3.5 stroke-[3px]")} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span
                                                            className={cn(
                                                                "font-semibold text-sm leading-tight",
                                                                selectedIds.includes(agenda.id) ? "text-[#125d72]" : "text-slate-700"
                                                            )}
                                                        >
                                                            {agenda.title}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                                                            {agenda.director} • <span className="text-[#125d72]/70">{agenda.urgency}</span>
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <p className="text-[10px] text-slate-400 italic">
                            *Hanya agenda dengan status &quot;DIJADWALKAN&quot; yang dipaparkan.
                        </p>
                    </div>
                </div>

                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-lg border-t">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="font-bold text-slate-500"
                    >
                        BATAL
                    </Button>
                    <Button
                        onClick={handleStartMeeting}
                        disabled={isLoading || selectedIds.length === 0}
                        className="bg-[#125d72] hover:bg-[#0e4b5d] font-bold min-w-32 uppercase tracking-wider"
                    >
                        {isLoading ? "PROSES..." : "BUKA RUANG SIDANG"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}