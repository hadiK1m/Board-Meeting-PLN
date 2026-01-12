/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SortableItem({ id, text, onUpdate, onDelete, index }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 bg-white border rounded-xl p-3 transition-all ${isDragging ? "shadow-2xl border-[#14a2ba] scale-[1.02] opacity-80" : "border-slate-200"
                }`}
        >
            <div {...attributes} {...listeners} className="cursor-grab p-1 text-slate-300 hover:text-[#14a2ba]">
                <GripVertical size={16} />
            </div>
            <div className="h-6 w-6 bg-[#125d72] text-white text-[10px] font-black rounded-lg flex items-center justify-center shrink-0">
                {index + 1}
            </div>
            <Input
                value={text}
                onChange={(e) => onUpdate(e.target.value)}
                placeholder="Tulis arahan..."
                className="border-none focus-visible:ring-0 text-xs font-bold"
            />
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-400 hover:bg-red-50">
                <Trash2 size={16} />
            </Button>
        </div>
    )
}