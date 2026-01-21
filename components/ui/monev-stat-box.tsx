import { cn } from "@/lib/utils"

interface MonevStatBoxProps {
    label: string
    value: number
    total: number
    color: string
    isLoading: boolean
}

export function MonevStatBox({ label, value, total, color, isLoading }: MonevStatBoxProps) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0

    return (
        <div className={cn("px-3 py-2 rounded-lg flex flex-col border h-14 transition-all hover:brightness-110 cursor-default", color)}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase opacity-90">{label}</span>
                {isLoading ? (
                    <div className="h-4 w-6 bg-current opacity-20 rounded animate-pulse"></div>
                ) : (
                    <span className="text-sm font-black">{value}</span>
                )}
            </div>
            {!isLoading && total > 0 && (
                <div className="mt-1 flex items-center justify-between">
                    <span className="text-[9px] opacity-70">dari {total}</span>
                    <span className="text-[9px] font-bold">{percentage}%</span>
                </div>
            )}
        </div>
    )
}