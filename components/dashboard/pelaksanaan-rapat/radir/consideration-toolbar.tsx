"use client"

import React from "react"
import {
    FileText,
    Indent,
    Outdent,
    Trash2,
    ArrowUp,
    ArrowDown,
    Bold,
    Heading1,
    List,
    ListOrdered,
    ListTodo
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
    focusedIndex,
    currentLevel,
    totalItems,
    onIndent,
    onOutdent,
    onMoveUp,
    onMoveDown,
    onDelete,
    onChangeStyle,
    currentStyle,
    onToggleOrderedList,
    onToggleBulletList,
    onSetListStyle,
    isOrderedListActive = false,
    currentListStyle = 'decimal'
}: ConsiderationToolbarProps) {
    const toolbarDisabled = focusedIndex === null
    const isFirstItem = focusedIndex === 0
    const isLastItem = focusedIndex === totalItems - 1

    const listStyles = [
        { value: 'decimal', label: '1.1.1' },
        { value: 'lower-alpha', label: 'a.b.c' },
        { value: 'lower-roman', label: 'i.ii.iii' },
        { value: 'upper-roman', label: 'I.II.III' },
        { value: 'upper-alpha', label: 'A.B.C' },
        { value: 'outline', label: 'I.A.1.a' },
    ]

    return (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
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
                                SMART EDITOR
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                {/* TOOLBAR AREA */}
                <div className="px-6 pb-3 flex items-center justify-between overflow-x-auto">
                    <div className="flex items-center gap-1 bg-white border rounded-md p-1 shadow-sm">
                        <TooltipProvider>
                            {/* MULTILEVEL LIST BUTTONS (NEW) */}
                            {onToggleOrderedList && (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={isOrderedListActive ? "secondary" : "ghost"}
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={onToggleOrderedList}
                                            >
                                                <ListOrdered className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Multilevel List</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={onToggleBulletList}
                                            >
                                                <ListTodo className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Bullet List</TooltipContent>
                                    </Tooltip>

                                    <Separator orientation="vertical" className="h-4 mx-1" />
                                </>
                            )}

                            {/* TEXT STYLING GROUP */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={currentStyle === 'normal' ? "secondary" : "ghost"} size="icon" className="h-7 w-7"
                                        onClick={() => onChangeStyle('normal')}
                                        disabled={toolbarDisabled}>
                                        <List className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Teks Normal</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={currentStyle === 'bold' ? "secondary" : "ghost"} size="icon" className="h-7 w-7"
                                        onClick={() => onChangeStyle('bold')}
                                        disabled={toolbarDisabled}>
                                        <Bold className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Tebal</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={currentStyle === 'h1' ? "secondary" : "ghost"} size="icon" className="h-7 w-7"
                                        onClick={() => onChangeStyle('h1')}
                                        disabled={toolbarDisabled}>
                                        <Heading1 className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Heading 1</TooltipContent>
                            </Tooltip>

                            <Separator orientation="vertical" className="h-4 mx-1" />

                            {/* INDENTATION GROUP */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={onOutdent}
                                        disabled={toolbarDisabled || currentLevel === 0}>
                                        <Outdent className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Geser Kiri (Outdent)</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={onIndent}
                                        disabled={toolbarDisabled || currentLevel >= 2}>
                                        <Indent className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Geser Kanan (Indent)</TooltipContent>
                            </Tooltip>

                            <Separator orientation="vertical" className="h-4 mx-1" />

                            {/* MOVEMENT GROUP */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={onMoveUp}
                                        disabled={toolbarDisabled || isFirstItem}>
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pindah ke Atas</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={onMoveDown}
                                        disabled={toolbarDisabled || isLastItem}>
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pindah ke Bawah</TooltipContent>
                            </Tooltip>

                            <Separator orientation="vertical" className="h-4 mx-1" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                                        onClick={onDelete}
                                        disabled={toolbarDisabled}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus Baris</TooltipContent>
                            </Tooltip>

                            {/* LIST STYLE SELECTOR (NEW) */}
                            {onSetListStyle && (
                                <>
                                    <Separator orientation="vertical" className="h-4 mx-1" />
                                    <div className="flex gap-1 pl-1">
                                        {listStyles.map((style) => (
                                            <Tooltip key={style.value}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant={currentListStyle === style.value ? "secondary" : "ghost"}
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => onSetListStyle(style.value)}
                                                    >
                                                        {style.label}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {style.value === 'decimal' ? 'Multilevel Decimal' :
                                                        style.value === 'outline' ? 'Outline Style' :
                                                            style.value.replace('-', ' ').toUpperCase()}
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </>
                            )}
                        </TooltipProvider>
                    </div>

                    <div className="text-[10px] text-slate-400 italic hidden md:block">
                        Shortcut: Enter (Baris Baru) • Tab (Indent)
                    </div>
                </div>
            </div>
        </div>
    )
}