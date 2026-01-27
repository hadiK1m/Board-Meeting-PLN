"use client"

import React from "react"
import {
    FileText,
    ListOrdered
} from "lucide-react"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ConsiderationToolbarProps {
    activeAgendaTitle?: string
    focusedIndex: number | null
    currentLevel: number
    totalItems: number
    onIndent: () => void
    onOutdent: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    onDelete: () => void
    onChangeStyle: (style: 'bold' | 'h1' | 'h2' | 'h3' | 'normal') => void
    currentStyle?: string
    // Tambah props untuk Tiptap
    onToggleOrderedList?: () => void
    onToggleBulletList?: () => void
    onSetListStyle?: (style: string) => void
    isOrderedListActive?: boolean
    currentListStyle?: string
}

export function ConsiderationToolbar({
    activeAgendaTitle,


    onToggleOrderedList,
    onSetListStyle,
    isOrderedListActive = false,
    currentListStyle = 'decimal'
}: ConsiderationToolbarProps) {

    const listStyles = [
        { value: 'list-decimal', label: '1.a.i' },
        { value: 'list-outline', label: 'I.A.1.a' },
        { value: 'list-multidecimal', label: '1.1.1' },
        { value: 'list-upper-alpha', label: 'A.B.C' },
        { value: 'list-bullet', label: '• ◦ ▪' },
    ]

    return (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
            <div className="flex flex-col">
                <CardHeader className="py-3 px-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-[#125d72]/10 rounded-md">
                                <FileText className="h-4 w-4 text-[#125d72]" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-800">
                                    PENYUSUNAN PERTIMBANGAN
                                </CardTitle>
                                {activeAgendaTitle && (
                                    <p className="text-xs text-slate-500 truncate max-w-75">
                                        Agenda: {activeAgendaTitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                MULTILEVEL EDITOR
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                {/* TOOLBAR AREA - Hanya tombol Multilevel List */}
                <div className="px-6 pb-3 flex items-center justify-between overflow-x-auto">
                    <div className="flex items-center gap-1 bg-white border rounded-md p-1 shadow-sm">
                        <TooltipProvider>
                            {/* MULTILEVEL LIST BUTTONS ONLY */}
                            {onToggleOrderedList && (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={isOrderedListActive ? "secondary" : "ghost"}
                                                size="icon"
                                                className="h-8 w-8 hover:bg-slate-100"
                                                onClick={onToggleOrderedList}
                                            >
                                                <ListOrdered className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Multilevel List</p>
                                            <p className="text-xs text-slate-500">Aktifkan/Nonaktifkan</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <Separator orientation="vertical" className="h-6 mx-1" />

                                </>
                            )}
                        </TooltipProvider>
                    </div>

                    <div className="text-[10px] text-slate-400 italic hidden md:block">
                        Shortcut: Tab (Indent) • Shift+Tab (Outdent)
                    </div>
                </div>
            </div>
        </div>
    )
}