"use client"

import React, { useRef, useEffect, useState } from "react"
import {
    FileText,
    Indent,
    Outdent,
    Trash2,
    ArrowUp,
    ArrowDown,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ConsiderationItem {
    id: string
    text: string
    level: number
}

interface ConsiderationsSectionProps {
    considerations: ConsiderationItem[]
    setConsiderations: (items: ConsiderationItem[] | ((prev: ConsiderationItem[]) => ConsiderationItem[])) => void
    activeAgendaTitle?: string
}

const generateId = () => Date.now().toString() + Math.random().toString(36).slice(2)

export function ConsiderationsSection({
    considerations,
    setConsiderations,
    activeAgendaTitle,
}: ConsiderationsSectionProps) {
    const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({})
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

    // Auto-resize textarea height
    const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
    }

    useEffect(() => {
        Object.values(inputRefs.current).forEach(el => {
            if (el) adjustTextareaHeight(el);
        });
        // Cleanup refs on re-render to avoid memory leaks
        inputRefs.current = {}
    })

    // --- Logika Penomoran Cerdas ---
    const getLabel = (index: number) => {
        const currentItem = considerations[index]
        if (!currentItem) return ""
        const currentLevel = currentItem.level ?? 0
        let count = 0

        for (let i = index; i >= 0; i--) {
            const prevItem = considerations[i]
            const prevLevel = prevItem.level ?? 0
            if (prevLevel === currentLevel) {
                count++
            } else if (prevLevel < currentLevel) {
                break
            }
        }

        if (currentLevel === 0) return `${count}.`
        if (currentLevel === 1) return `${String.fromCharCode(96 + count)}.`
        if (currentLevel === 2) {
            const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]
            return `${roman[(count - 1) % roman.length] || count}.`
        }
        return "•"
    }

    // --- Actions ---
    const updateItem = (index: number, updates: Partial<ConsiderationItem>) => {
        setConsiderations((prev) => {
            const newItems = [...prev]
            newItems[index] = { ...newItems[index], ...updates }
            return newItems
        })
    }

    const addItem = (index: number, level: number = 0) => {
        const newItem: ConsiderationItem = { id: generateId(), text: "", level }
        setConsiderations((prev) => {
            const newItems = [...prev]
            newItems.splice(index + 1, 0, newItem)
            return newItems
        })
        setTimeout(() => inputRefs.current[newItem.id]?.focus(), 0)
    }

    const removeItem = (index: number) => {
        if (considerations.length <= 1 && index === 0) {
            updateItem(0, { text: "", level: 0 })
            return
        }
        const prevId = index > 0 ? considerations[index - 1].id : null
        setConsiderations((prev) => prev.filter((_, i) => i !== index))
        if (prevId) setTimeout(() => {
            const el = inputRefs.current[prevId]
            if (el) {
                el.focus()
                el.setSelectionRange(el.value.length, el.value.length)
            }
        }, 0)
    }

    const changeLevel = (index: number, direction: "indent" | "outdent") => {
        const currentLevel = considerations[index].level ?? 0
        let newLevel = currentLevel
        if (direction === "indent") newLevel = Math.min(2, currentLevel + 1)
        else newLevel = Math.max(0, currentLevel - 1)

        if (newLevel !== currentLevel) updateItem(index, { level: newLevel })
    }

    const moveItem = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return
        if (direction === "down" && index === considerations.length - 1) return

        setConsiderations(prev => {
            const newItems = [...prev]
            const targetIndex = direction === "up" ? index - 1 : index + 1
            const temp = newItems[index]
            newItems[index] = newItems[targetIndex]
            newItems[targetIndex] = temp
            return newItems
        })
        // Keep focus
        setTimeout(() => inputRefs.current[considerations[index].id]?.focus(), 0)
    }

    // --- Keyboard Handler ---
    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addItem(index, considerations[index].level ?? 0)
        }
        if (e.key === "Tab") {
            e.preventDefault()
            changeLevel(index, e.shiftKey ? "outdent" : "indent")
        }
        if (e.key === "Backspace" && considerations[index].text === "") {
            const currentLevel = considerations[index].level ?? 0
            if (currentLevel > 0) {
                e.preventDefault()
                changeLevel(index, "outdent")
            } else if (considerations.length > 0) {
                e.preventDefault()
                removeItem(index)
            }
        }
        if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault()
            inputRefs.current[considerations[index - 1].id]?.focus()
        }
        if (e.key === "ArrowDown" && index < considerations.length - 1) {
            e.preventDefault()
            inputRefs.current[considerations[index + 1].id]?.focus()
        }
    }

    // Init Data
    useEffect(() => {
        if (!considerations || considerations.length === 0) {
            setConsiderations([{ id: generateId(), text: "", level: 0 }])
        }
    }, [considerations, setConsiderations])

    // Helper variables untuk toolbar state
    const toolbarDisabled = focusedIndex === null
    const currentLevel = focusedIndex !== null ? considerations[focusedIndex]?.level ?? 0 : 0
    const isFirstItem = focusedIndex === 0
    const isLastItem = focusedIndex === (considerations?.length || 0) - 1

    return (
        <Card className="border-none shadow-none bg-transparent flex flex-col h-full">
            {/* --- HEADER (Sticky) --- */}
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
                                    SMART LIST
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    {/* TOOLBAR AREA */}
                    <div className="px-6 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-white border rounded-md p-1 shadow-sm">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                            onClick={() => focusedIndex !== null && changeLevel(focusedIndex, "outdent")}
                                            disabled={toolbarDisabled || currentLevel === 0}>
                                            <Outdent className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Geser Kiri (Outdent)</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                            onClick={() => focusedIndex !== null && changeLevel(focusedIndex, "indent")}
                                            disabled={toolbarDisabled || currentLevel >= 2}>
                                            <Indent className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Geser Kanan (Indent)</TooltipContent>
                                </Tooltip>

                                <Separator orientation="vertical" className="h-4 mx-1" />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                            onClick={() => focusedIndex !== null && moveItem(focusedIndex, "up")}
                                            disabled={toolbarDisabled || isFirstItem}>
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Pindah ke Atas</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                            onClick={() => focusedIndex !== null && moveItem(focusedIndex, "down")}
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
                                            onClick={() => focusedIndex !== null && removeItem(focusedIndex)}
                                            disabled={toolbarDisabled}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Hapus Baris</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="text-[10px] text-slate-400 italic hidden md:block">
                            Shortcut: Enter (Baris Baru) • Tab (Indent) • Shift+Tab (Outdent)
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CANVAS (The Desk) --- */}
            <div className="bg-[#F0F2F5] p-4 md:p-8 flex-1 flex justify-center items-start overflow-y-auto cursor-text min-h-[calc(100vh-200px)]"
                onClick={() => {
                    const lastId = considerations[considerations.length - 1]?.id;
                    if (lastId) inputRefs.current[lastId]?.focus();
                }}>

                {/* --- THE PAPER --- */}
                <div
                    className="bg-white w-full max-w-212.5 min-h-264 shadow-sm border border-[#e1e3e6] relative transition-all duration-300 px-12 py-16 md:px-24 md:py-24"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="space-y-0.5">
                        {considerations.map((item, index) => {
                            const level = item.level ?? 0;
                            const paddingLeft = level * 36;

                            return (
                                <div
                                    key={item.id}
                                    className={`group relative flex items-start ${focusedIndex === index ? "z-10" : "z-0"}`}
                                    style={{ paddingLeft: `${paddingLeft}px` }}
                                >
                                    {/* Numbering */}
                                    <div className="absolute left-0 w-full flex justify-end pr-3 select-none pointer-events-none"
                                        style={{ width: `${paddingLeft + 40}px`, left: 0, top: '2px' }}>
                                        <span className={`text-[15px] font-medium font-serif leading-relaxed ${level === 0 ? "text-slate-900" : "text-slate-600"
                                            }`}>
                                            {getLabel(index)}
                                        </span>
                                    </div>

                                    {/* Input */}
                                    <textarea
                                        ref={(el) => {
                                            inputRefs.current[item.id] = el
                                            if (el) adjustTextareaHeight(el);
                                        }}
                                        rows={1}
                                        className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-[15px] text-slate-800 leading-relaxed p-0 m-0 placeholder:text-slate-300 font-serif focus:ring-0 selection:bg-blue-100"
                                        value={item.text}
                                        placeholder="Ketik pertimbangan..."
                                        onFocus={() => setFocusedIndex(index)}
                                        onBlur={() => setFocusedIndex(null)}
                                        onChange={(e) => {
                                            updateItem(index, { text: e.target.value });
                                            adjustTextareaHeight(e.target);
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        style={{ marginLeft: '45px' }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Card>
    )
}