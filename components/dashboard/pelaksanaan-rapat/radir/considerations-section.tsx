"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, GripVertical, Plus } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface ConsiderationItem {
    id: string
    text: string
}

interface ConsiderationsSectionProps {
    considerations: ConsiderationItem[]
    setConsiderations: (items: ConsiderationItem[] | ((prev: ConsiderationItem[]) => ConsiderationItem[])) => void
}

const SortableItem = ({ id, text, onUpdate, onDelete }: { id: string; text: string; onUpdate: (text: string) => void; onDelete: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 group hover:border-[#125d72]/30 transition-colors">
            <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-[#125d72]">
                <GripVertical className="h-5 w-5" />
            </div>
            <Input
                value={text}
                onChange={(e) => onUpdate(e.target.value)}
                className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium"
                placeholder="Masukkan poin pertimbangan..."
            />
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

export function ConsiderationsSection({ considerations, setConsiderations }: ConsiderationsSectionProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setConsiderations((items: ConsiderationItem[]) => {
                const oldIndex = items.findIndex((i) => i.id === active.id)
                const newIndex = items.findIndex((i) => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const addItem = () => {
        const newItem = { id: Date.now().toString(), text: "" }
        setConsiderations((prev) => [...prev, newItem])
    }

    const updateItem = (id: string, text: string) => {
        setConsiderations(
            considerations.map((item) =>
                item.id === id ? { ...item, text } : item
            )
        )
    }

    const deleteItem = (id: string) => {
        setConsiderations(considerations.filter((item) => item.id !== id))
    }

    return (
        <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-wider text-[#125d72]">
                Dasar Pertimbangan
            </h4>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={considerations.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-30">
                        {considerations.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-400 italic text-sm">
                                Belum ada poin pertimbangan. Tambahkan poin baru di bawah.
                            </div>
                        ) : (
                            considerations.map((item) => (
                                <SortableItem
                                    key={item.id}
                                    id={item.id}
                                    text={item.text}
                                    onUpdate={(text) => updateItem(item.id, text)}
                                    onDelete={() => deleteItem(item.id)}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Tombol Tambah dipindah ke bawah – style mirip rakordir */}
            <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full border-dashed border-2 border-slate-200 hover:border-[#125d72] hover:bg-[#125d72]/5 text-slate-400 hover:text-[#125d72] h-12 rounded-xl transition-all group mt-4"
            >
                <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                    Tambah Poin Pertimbangan Baru
                </span>
            </Button>
        </div>
    )
}