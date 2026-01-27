/* eslint-disable @typescript-eslint/no-explicit-any */
// components/dashboard/pelaksanaan-rapat/radir/meeting-decisions-section.tsx
"use client"

import React, { useRef } from "react"
import {
    Gavel,
    Plus,
    Trash2,
    GripVertical,
    CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface DecisionItem {
    id: string
    text: string
}

interface MeetingDecisionsSectionProps {
    decisions: DecisionItem[]
    setDecisions: (items: DecisionItem[] | ((prev: DecisionItem[]) => DecisionItem[])) => void
}

const SortableDecisionItem = ({
    id,
    text,
    onUpdate,
    onDelete,
}: {
    id: string
    text: string
    onUpdate: (text: string) => void
    onDelete: () => void
}) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    // Ref dan handler untuk auto-resize
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate(e.target.value)
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }, [text])

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 group hover:border-[#125d72]/30 transition-colors"
        >
            {/* Handle Drag */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab text-slate-400 hover:text-[#125d72]"
            >
                <GripVertical className="h-5 w-5" />
            </div>

            {/* Input Keputusan */}
            <textarea
                ref={textareaRef}
                value={text}
                onChange={handleInput}
                className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium resize-y max-h-75 bg-transparent"
                placeholder="Tuliskan butir keputusan secara lugas dan jelas..."
                rows={1}
                style={{ overflow: 'auto' }}
            />

            {/* Tombol Hapus */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

export function MeetingDecisionsSection({ decisions, setDecisions }: MeetingDecisionsSectionProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setDecisions((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id)
                const newIndex = items.findIndex((i) => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const addDecision = () => {
        const newItem = { id: Date.now().toString(), text: "" }
        setDecisions((prev) => [...prev, newItem])
    }

    const updateDecision = (id: string, text: string) => {
        setDecisions(
            decisions.map((item) => (item.id === id ? { ...item, text } : item))
        )
    }

    const deleteDecision = (id: string) => {
        setDecisions(decisions.filter((item) => item.id !== id))
    }

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#125d72]/10 rounded-lg">
                        <Gavel className="h-5 w-5 text-[#125d72]" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-black uppercase tracking-widest text-[#125d72]">
                            Butir-Butir Keputusan
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1">
                            Ketetapan hasil rapat yang bersifat final
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={decisions.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3 min-h-35">
                            {decisions.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">
                                        Belum ada butir keputusan.
                                        <br />
                                        Tambahkan di bawah.
                                    </p>
                                </div>
                            ) : (
                                decisions.map((decision, index) => (
                                    <div key={decision.id} className="relative pl-10">
                                        <SortableDecisionItem
                                            id={decision.id}
                                            text={decision.text}
                                            onUpdate={(text) => updateDecision(decision.id, text)}
                                            onDelete={() => deleteDecision(decision.id)}
                                        />
                                        {/* Nomor urut di kiri */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-[#125d72] text-white text-sm font-black flex items-center justify-center shadow-md">
                                            {index + 1}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* Tombol Tambah Butir – dipindah ke bawah */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={addDecision}
                    className="w-full border-dashed border-2 border-slate-200 hover:border-[#125d72] hover:bg-[#125d72]/5 text-slate-400 hover:text-[#125d72] h-12 rounded-xl transition-all group mt-2"
                >
                    <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        Tambah Butir Keputusan Baru
                    </span>
                </Button>
            </CardContent>

            <div className="bg-slate-50/50 p-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs">
                <Badge
                    variant="outline"
                    className="text-xs font-black text-[#125d72] border-[#125d72]/20 bg-[#125d72]/5 px-4 py-1"
                >
                    TOTAL: {decisions.length} BUTIR KEPUTUSAN
                </Badge>
                <p className="text-[10px] text-slate-500 italic">
                    Keputusan ini akan diproses menjadi draf Surat Keputusan Rapat Direksi.
                </p>
            </div>
        </Card>
    )
}