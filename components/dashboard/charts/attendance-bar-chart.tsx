/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { BarChart3, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts"

type ChartSortType = "name" | "percentage" | "attendance"

interface AttendanceBarChartProps {
    data: Array<{
        name: string
        attendance: number
        total: number
        percentage: number
        fill?: string
    }>
    loading: boolean
}

export function AttendanceBarChart({ data, loading }: AttendanceBarChartProps) {
    const [chartSort, setChartSort] = useState<ChartSortType>("percentage")
    const [highlightedBar, setHighlightedBar] = useState<string | null>(null)

    const chartColors = [
        "#125d72", "#0e4b5c", "#168a9e", "#14a2ba", "#0c7c8c",
        "#1a9cb0", "#0d6d7d", "#1db4ca", "#0f5a6c", "#22cce0"
    ]

    const getSortedChartData = () => {
        const chartData = [...data].map((item, index) => ({
            ...item,
            fill: chartColors[index % chartColors.length]
        }))

        switch (chartSort) {
            case "name": return chartData.sort((a, b) => a.name.localeCompare(b.name))
            case "percentage": return chartData.sort((a, b) => b.percentage - a.percentage)
            case "attendance": return chartData.sort((a, b) => b.attendance - a.attendance)
            default: return chartData
        }
    }

    const sortedChartData = getSortedChartData()

    return (
        <Card className="shadow-xl border border-slate-200 rounded-2xl bg-white overflow-hidden w-full">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-black text-[#125d72] uppercase tracking-wide flex items-center gap-2">
                            <Users className="h-5 w-5" /> Persentase Kehadiran Direksi
                        </CardTitle>
                        <CardDescription className="font-medium text-slate-500">
                            Akumulasi kehadiran per direktur berdasarkan rapat RADIR yang telah selesai
                        </CardDescription>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="text-sm text-slate-600 font-medium whitespace-nowrap">Urutkan berdasarkan:</div>
                        <Select value={chartSort} onValueChange={(value: ChartSortType) => setChartSort(value)}>
                            <SelectTrigger className="w-full sm:w-48 h-9">
                                <SelectValue placeholder="Pilih urutan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">Persentase Tertinggi</SelectItem>
                                <SelectItem value="attendance">Kehadiran Tertinggi</SelectItem>
                                <SelectItem value="name">Nama A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#125d72]"></div>
                            <div className="text-slate-500 text-sm mt-2">Memuat data chart...</div>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-400">
                        <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                        <p className="text-sm font-medium">Tidak ada data kehadiran untuk ditampilkan</p>
                        <p className="text-xs mt-1 text-slate-500">Pilih rentang tanggal lain untuk melihat data</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="h-100 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={sortedChartData}
                                    margin={{ top: 30, right: 30, left: 10, bottom: 80 }}
                                    barSize={40}
                                    onMouseMove={(state: any) => {
                                        if (state.activePayload && state.activePayload[0]) {
                                            setHighlightedBar(state.activePayload[0].payload.name)
                                        }
                                    }}
                                    onMouseLeave={() => setHighlightedBar(null)}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                        interval={0}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        domain={[0, 100]}
                                        tickFormatter={(value) => `${value}%`}
                                        width={45}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload
                                                return (
                                                    <div className="bg-white p-3 shadow-lg border border-slate-200 rounded-lg">
                                                        <div className="font-bold text-slate-800 mb-1">{label}</div>
                                                        <div className="text-sm text-slate-600">
                                                            <div className="flex justify-between">
                                                                <span>Persentase:</span>
                                                                <span className="font-bold text-[#125d72]">{data.percentage}%</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Kehadiran:</span>
                                                                <span className="font-bold">{data.attendance}/{data.total}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                        cursor={{ fill: 'rgba(18, 93, 114, 0.05)' }}
                                    />
                                    <Bar
                                        dataKey="percentage"
                                        name="Persentase Kehadiran"
                                        radius={[6, 6, 0, 0]}
                                        onMouseEnter={(data: any) => setHighlightedBar(data.name)}
                                        onMouseLeave={() => setHighlightedBar(null)}
                                    >
                                        {sortedChartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={highlightedBar === entry.name ? `${entry.fill}CC` : entry.fill}
                                                className="transition-all duration-200"
                                                strokeWidth={highlightedBar === entry.name ? 1.5 : 0}
                                                stroke="#0e4b5c"
                                            />
                                        ))}
                                        <LabelList
                                            dataKey="percentage"
                                            position="top"
                                            formatter={(value: number) => `${value}%`}
                                            className="text-xs font-bold fill-slate-700"
                                            offset={10}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Legend & Summary */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-linear-to-br from-[#125d72] to-[#0e4b5c]"></div>
                                    <span className="text-sm font-medium text-slate-700">Persentase Kehadiran</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">Tertinggi:</span>
                                        <span className="font-bold text-[#125d72]">
                                            {Math.max(...data.map(d => d.percentage))}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">Terendah:</span>
                                        <span className="font-bold text-slate-700">
                                            {Math.min(...data.map(d => d.percentage))}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}