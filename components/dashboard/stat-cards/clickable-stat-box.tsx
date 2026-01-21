import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClickableStatBoxProps {
    label: string
    value: number
    icon: React.ComponentType<{ className?: string }>
    color: string
    isLoading: boolean
    onClick: () => void
}

export function ClickableStatBox({ label, value, icon: Icon, color, isLoading, onClick }: ClickableStatBoxProps) {
    return (
        <button
            type="button"
            className={cn(
                "p-3 rounded-xl flex flex-col justify-between h-20 transition-all cursor-pointer shadow-sm border border-white/5 w-full text-left",
                color,
                "hover:scale-105 hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30"
            )}
            onClick={onClick}
            title={`Klik untuk lihat agenda ${label}`}
            disabled={isLoading}
        >
            <div className="flex justify-between items-start">
                <Icon className="h-4 w-4 opacity-70" />
                {isLoading ? (
                    <div className="h-5 w-8 bg-current opacity-20 rounded animate-pulse"></div>
                ) : (
                    <span className="text-xl font-black tracking-tight">{value}</span>
                )}
            </div>
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase opacity-80 leading-tight">{label}</span>
                {!isLoading && value > 0 && (
                    <ArrowRight className="h-3 w-3 opacity-60" />
                )}
            </div>
        </button>
    )
}