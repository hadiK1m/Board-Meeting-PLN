import { FileText, File, ArrowRight, Clock, PauseCircle, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClickableStatBox } from "./clickable-stat-box"

interface RakordirCardProps {
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
    onCardClick: (meetingType: "RAKORDIR", status: string, label: string) => void
}

export function RakordirCard({ data, loading, onCardClick }: RakordirCardProps) {
    return (
        <Card className="border-none shadow-xl bg-linear-to-br from-[#125d72] to-[#0e4b5c] text-white rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-24 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none group-hover:bg-white/10 transition-all"></div>
            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90">
                    <FileText className="h-5 w-5 text-[#efe62f]" /> Rakordir
                </CardTitle>
                <p className="text-xs text-slate-300 font-medium uppercase tracking-wide">Rapat Koordinasi</p>
            </CardHeader>
            <CardContent className="pt-4 relative z-10">
                <div className="grid grid-cols-3 gap-3">
                    <ClickableStatBox
                        label="Draft"
                        value={data.draft}
                        icon={File}
                        color="bg-white/10 text-slate-300"
                        isLoading={loading}
                        onClick={() => onCardClick("RAKORDIR", "DRAFT", "Draft")}
                    />
                    <ClickableStatBox
                        label="Dapat Dilanjut"
                        value={data.dapatDilanjutkan}
                        icon={ArrowRight}
                        color="bg-white/10 text-emerald-300"
                        isLoading={loading}
                        onClick={() => onCardClick("RAKORDIR", "DAPAT_DILANJUTKAN", "Dapat Dilanjutkan")}
                    />
                    <ClickableStatBox
                        label="Dijadwalkan"
                        value={data.dijadwalkan}
                        icon={Clock}
                        color="bg-white/10 text-blue-300"
                        isLoading={loading}
                        onClick={() => onCardClick("RAKORDIR", "DIJADWALKAN", "Dijadwalkan")}
                    />
                    <ClickableStatBox
                        label="Ditunda"
                        value={data.ditunda}
                        icon={PauseCircle}
                        color="bg-white/10 text-amber-300"
                        isLoading={loading}
                        onClick={() => onCardClick("RAKORDIR", "DITUNDA", "Ditunda")}
                    />
                    <ClickableStatBox
                        label="Selesai"
                        value={data.selesai}
                        icon={CheckCircle2}
                        color="bg-white/10 text-white"
                        isLoading={loading}
                        onClick={() => onCardClick("RAKORDIR", "RAPAT_SELESAI", "Selesai")}
                    />
                    <ClickableStatBox
                        label="Dibatalkan"
                        value={data.dibatalkan}
                        icon={XCircle}
                        color="bg-white/10 text-red-300"
                        isLoading={loading}
                        onClick={() => onCardClick("RAKORDIR", "DIBATALKAN", "Dibatalkan")}
                    />
                </div>
                <div className="mt-5 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total Agenda (Semua Status)</span>
                    <span className="text-xl font-black">{loading ? "-" : data.total}</span>
                </div>
            </CardContent>
        </Card>
    )
}