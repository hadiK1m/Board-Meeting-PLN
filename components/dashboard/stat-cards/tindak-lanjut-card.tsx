import { ListTodo } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonevStatBox } from "../../ui/monev-stat-box"

interface TindakLanjutCardProps {
    data: {
        radir: { inProgress: number; done: number; total: number }
        rakordir: { inProgress: number; done: number; total: number }
    }
    loading: boolean
}

export function TindakLanjutCard({ data, loading }: TindakLanjutCardProps) {
    return (
        <Card className="border-none shadow-xl bg-linear-to-br from-slate-700 to-slate-800 text-white rounded-2xl overflow-hidden relative group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-24 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 opacity-90">
                    <ListTodo className="h-5 w-5 text-purple-400" /> Tindak Lanjut
                </CardTitle>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Monitoring & Evaluasi</p>
            </CardHeader>
            <CardContent className="pt-4 relative z-10 space-y-4">
                {/* RAKORDIR Follow Up */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rakordir</span>
                        <span className="text-xs text-slate-300 font-medium">{data.rakordir.total} agenda</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <MonevStatBox
                            label="Dalam Proses"
                            value={data.rakordir.inProgress}
                            total={data.rakordir.total}
                            color="bg-purple-500/10 text-purple-300 border-purple-500/20"
                            isLoading={loading}
                        />
                        <MonevStatBox
                            label="Selesai"
                            value={data.rakordir.done}
                            total={data.rakordir.total}
                            color="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            isLoading={loading}
                        />
                    </div>
                </div>

                {/* RADIR Follow Up */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rapat Direksi</span>
                        <span className="text-xs text-slate-300 font-medium">{data.radir.total} agenda</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <MonevStatBox
                            label="Dalam Proses"
                            value={data.radir.inProgress}
                            total={data.radir.total}
                            color="bg-purple-500/10 text-purple-300 border-purple-500/20"
                            isLoading={loading}
                        />
                        <MonevStatBox
                            label="Selesai"
                            value={data.radir.done}
                            total={data.radir.total}
                            color="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            isLoading={loading}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}