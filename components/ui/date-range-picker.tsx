import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
}

export function DateRangePicker({ date, setDate }: DateRangePickerProps) {
    return (
        <div className="grid gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-65 justify-start text-left font-semibold h-11 rounded-xl border-slate-300 shadow-sm hover:bg-slate-50", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-[#125d72]" />
                        {date?.from ? (date.to ? <>{format(date.from, "dd MMM yyyy", { locale: id })} - {format(date.to, "dd MMM yyyy", { locale: id })}</> : format(date.from, "dd MMM yyyy", { locale: id })) : <span>Pilih Tanggal</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}