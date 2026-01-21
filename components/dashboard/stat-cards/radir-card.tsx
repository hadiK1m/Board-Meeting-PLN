import { BarChart3, File, ArrowRight, Clock, PauseCircle, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClickableStatBox } from "./clickable-stat-box"

interface RadirCardProps {
    data: {
        draft: number
        dapatDilanjutkan: number
        dijadwalkan: number
        ditunda: number
        selesai: number
        dibatalkan: number
        total: number
    }
    loading: boolean
    onCardClick: (meetingType: "RADIR", status: string, label: string) => void
}

export function RadirCard({ data, loading, onCardClick }: RadirCardProps) {
    return (
        <Card className="border-none shadow-xl bg-linear-to-br from-[#14a2ba] to-[#118a9e] text-white rounded-2xl overflow-hidden relative group">
            <div className="absolute bottom-0 left-0 p-24 bg-white/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none group-hover:bg-white/15 transition-all"></div>
            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90">
                    <BarChart3 className="h-5 w-5 text-white" /> Rapat Direksi
                </CardTitle>
                <p className="text-xs text-blue-100 font-medium uppercase tracking-wide">Rapat Keputusan</p>
            </CardHeader>
            <CardContent className="pt-4 relative z-10">
                <div className="grid grid-cols-3 gap-3">
                    <ClickableStatBox
                        label="Draft"
                        value={data.draft}
                        icon={File}
                        color="bg-white/20 text-blue-100"
                        isLoading={loading}
                        onClick={() => onCardClick("RADIR", "DRAFT", "Draft")}
                    />
                    <ClickableStatBox
                        label="Dapat Dilanjut"
                        value={data.dapatDilanjutkan}
                        icon={ArrowRight}
                        color="bg-white/20 text-white"
                        isLoading={loading}
                        onClick={() => onCardClick("RADIR", "DAPAT_DILANJUTKAN", "Dapat Dilanjutkan")}
                    />
                    <ClickableStatBox
                        label="Dijadwalkan"
                        value={data.dijadwalkan}
                        icon={Clock}
                        color="bg-white/20 text-white"
                        isLoading={loading}
                        onClick={() => onCardClick("RADIR", "DIJADWALKAN", "Dijadwalkan")}
                    />
                    <ClickableStatBox
                        label="Ditunda"
                        value={data.ditunda}
                        icon={PauseCircle}
                        color="bg-white/20 text-amber-200"
                        isLoading={loading}
                        onClick={() => onCardClick("RADIR", "DITUNDA", "Ditunda")}
                    />
                    <ClickableStatBox
                        label="Selesai"
                        value={data.selesai}
                        icon={CheckCircle2}
                        color="bg-white/20 text-white"
                        isLoading={loading}
                        onClick={() => onCardClick("RADIR", "RAPAT_SELESAI", "Selesai")}
                    />
                    <ClickableStatBox
                        label="Dibatalkan"
                        value={data.dibatalkan}
                        icon={XCircle}
                        color="bg-white/20 text-red-200"
                        isLoading={loading}
                        onClick={() => onCardClick("RADIR", "DIBATALKAN", "Dibatalkan")}
                    />
                </div>
                <div className="mt-5 pt-3 border-t border-white/20 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Total Agenda (Semua Status)</span>
                    <span className="text-xl font-black">{loading ? "-" : data.total}</span>
                </div>
            </CardContent>
        </Card>
    )
}