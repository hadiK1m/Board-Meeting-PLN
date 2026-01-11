"use client"

import React from "react"
import {
    ListChecks,
    Plus,
    Trash2,
    GripVertical,
    CheckCircle2,
    AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface ArahanItem {
    id: string
    text: string
}

interface ArahanDireksiSectionProps {
    arahan: ArahanItem[]
    setArahan: (items: ArahanItem[] | ((prev: ArahanItem[]) => ArahanItem[])) => void
}

/**
 * Komponen Item yang bisa di-sort (Sortable)
 */
const SortableArahanItem = ({
    id,
    text,
    onUpdate,
    onDelete,
    index,
}: {
    id: string
    text: string
    onUpdate: (text: string) => void
    onDelete: () => void
    index: number
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-4 bg-white border rounded-2xl p-4 transition-all group relative",
                isDragging ? "shadow-2xl border-[#14a2ba] scale-[1.02]" : "border-slate-200 hover:border-[#14a2ba]/50 shadow-sm"
            )}
        >
            {/* Handle Drag */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-[#14a2ba] transition-colors"
            >
                <GripVertical className="h-5 w-5" />
            </button>

            {/* Nomor Urut Bulat */}
            <div className="h-7 w-7 rounded-full bg-[#125d72] text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-md shadow-[#125d72]/20">
                {(index + 1).toString().padStart(2, '0')}
            </div>

            {/* Input Arahan */}
            <Input
                value={text}
                onChange={(e) => onUpdate(e.target.value)}
                placeholder="Tuliskan poin arahan direksi di sini..."
                className="border-none focus-visible:ring-0 text-xs font-bold text-slate-700 bg-transparent placeholder:text-slate-300"
            />

            {/* Tombol Hapus */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

/**
 * Komponen Utama Seksi Arahan Direksi
 */
export function ArahanDireksiSection({
    arahan,
    setArahan,
}: ArahanDireksiSectionProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setArahan((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id)
                const newIndex = items.findIndex((i) => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const addArahan = () => {
        const newItem = { id: crypto.randomUUID(), text: "" }
        setArahan((prev) => [...prev, newItem])
    }

    const updateArahan = (id: string, text: string) => {
        setArahan((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)))
    }

    const deleteArahan = (id: string) => {
        setArahan((prev) => prev.filter((item) => item.id !== id))
    }

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#14a2ba] rounded-xl shadow-lg shadow-[#14a2ba]/20">
                        <ListChecks className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                            Arahan Direksi
                        </CardTitle>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5 italic">
                            Butir-butir tindak lanjut rapat koordinasi
                        </p>
                    </div>
                </div>
                <Button
                    onClick={addArahan}
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl border-[#14a2ba] text-[#14a2ba] font-black text-[9px] uppercase tracking-widest hover:bg-[#14a2ba]/10"
                >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Poin
                </Button>
            </CardHeader>

            <CardContent className="p-6">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={arahan.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {arahan.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
                                    <AlertCircle className="h-10 w-10 text-slate-200 mb-3" />
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic text-center">
                                        Belum ada butir arahan.<br />Klik tombol "Tambah Poin" untuk memulai.
                                    </p>
                                </div>
                            ) : (
                                arahan.map((item, index) => (
                                    <SortableArahanItem
                                        key={item.id}
                                        id={item.id}
                                        index={index}
                                        text={item.text}
                                        onUpdate={(text) => updateArahan(item.id, text)}
                                        onDelete={() => deleteArahan(item.id)}
                                    />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </CardContent>

            {/* FOOTER INFO */}
            <div className="bg-slate-50/50 p-4 px-6 border-t border-slate-100 flex items-center justify-between">
                <Badge variant="outline" className="bg-white border-slate-200 text-[#125d72] font-black text-[9px] px-3">
                    TOTAL: {arahan.length} ARAHAN
                </Badge>
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                        Urutan poin dapat diatur dengan menarik handle di sisi kiri.
                    </span>
                </div>
            </div>
        </Card>
    )
}

// Utility untuk menggabungkan class (cn) jika belum ada di project Anda
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}