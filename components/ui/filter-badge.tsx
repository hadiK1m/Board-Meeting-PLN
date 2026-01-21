import { Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FilterBadgeProps {
    filter: {
        clearLabel?: string
    }
    filteredCount: number
}

export function FilterBadge({ filter, filteredCount }: FilterBadgeProps) {
    if (!filter.clearLabel) return null

    return (
        <div className="pt-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Filter className="h-3 w-3 mr-1" />
                Filter: {filter.clearLabel}
                <span className="ml-2 text-xs">
                    ({filteredCount} agenda ditemukan)
                </span>
            </Badge>
        </div>
    )
}