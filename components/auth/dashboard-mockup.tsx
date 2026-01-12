'use client';

import React from 'react';
import { Search, Bell, Layout, HelpCircle, FileSearch } from 'lucide-react';

export function DashboardMockup() {
    return (
        <div className="relative group select-none">
            {/* Snake Border Animation Container */}
            <div className="absolute -inset-0.5 rounded-3xl overflow-hidden pointer-events-none">
                <div className="absolute inset-[-500%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_20deg,#6366f1_40deg,#a855f7_60deg,transparent_80deg)] animate-[spin_4s_linear_infinite]"></div>
            </div>

            {/* Main Dashboard Container */}
            <div className="relative bg-white rounded-[22px] shadow-2xl border border-slate-200/50 overflow-hidden w-full aspect-4/3 flex flex-col">

                {/* Top Header Tabs */}
                <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/30">
                    <div className="flex gap-1">
                        <div className="px-6 py-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-xs font-bold text-slate-900">Dashboard</div>
                        <div className="px-6 py-1.5 text-xs font-bold text-slate-400">Rapat</div>
                        <div className="px-6 py-1.5 text-xs font-bold text-slate-400">Dokumen</div>
                    </div>
                </div>

                {/* Second Header Bar (Search & Icons) */}
                <div className="h-14 border-b border-slate-50 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4 flex-1">
                        <Layout className="w-4 h-4 text-slate-400" />
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                            <div className="w-full bg-slate-50 border-none rounded-md py-1.5 pl-9 pr-3 text-[11px] text-slate-300">
                                Cari dokumen rapat...
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><HelpCircle size={14} /></div>
                            <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><Bell size={14} /></div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-200 border border-white shadow-sm flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full bg-linear-to-tr from-blue-300 to-blue-500"></div>
                        </div>
                    </div>
                </div>

                {/* Content Area - Empty State */}
                <div className="flex-1 p-8 bg-white flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                        <div className="absolute -inset-16 bg-slate-50 rounded-full opacity-50 blur-3xl -z-10"></div>

                        <div className="w-32 h-32 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-700">
                            <FileSearch className="w-12 h-12 text-slate-200 group-hover:text-blue-400 transition-colors duration-700" strokeWidth={1.5} />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Menunggu Jadwal</h3>

                    <p className="text-sm text-slate-400 max-w-60 leading-relaxed">
                        Belum ada agenda rapat direksi yang dijadwalkan hari ini.
                    </p>

                    <div className="mt-8 px-6 py-2 bg-slate-50 text-slate-400 text-xs font-bold rounded-lg border border-slate-100">
                        Lihat Kalender
                    </div>

                    {/* Ghost UI Elements */}
                    <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-4 opacity-20 select-none">
                        <div className="h-20 bg-slate-50 rounded-xl border border-dashed border-slate-200"></div>
                        <div className="h-20 bg-slate-50 rounded-xl border border-dashed border-slate-200"></div>
                        <div className="h-20 bg-slate-50 rounded-xl border border-dashed border-slate-200"></div>
                    </div>
                </div>
            </div>

            {/* Background blobs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-200/30 rounded-full blur-[80px] -z-10"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-100/40 rounded-full blur-[100px] -z-10"></div>
        </div>
    );
}