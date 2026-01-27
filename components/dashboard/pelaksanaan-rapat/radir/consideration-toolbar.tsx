/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { RefObject } from "react"
import { Bold, Italic, ListOrdered, List, CornerDownLeft, CornerDownRight } from "lucide-react"
import type { ConsiderationEditorHandle } from "./ConsiderationEditor"

type Props = {
    editorRef: RefObject<ConsiderationEditorHandle | null>
    currentListStyle: string
    onSetListStyle: (style: string) => void
    isOrderedListActive: boolean
    onMoveUp: () => void
    onMoveDown: () => void
    onDelete: () => void
}

export function ConsiderationToolbar({
    editorRef,
    currentListStyle,
    onSetListStyle,
    isOrderedListActive,
    onMoveUp,
    onMoveDown,
    onDelete,
}: Props) {
    const exec = (fnName: string) => {
        const editor = editorRef.current?.editor
        if (!editor) return
        try {
            switch (fnName) {
                case "toggleOrdered": return (editor as any).chain().focus().toggleOrderedList().run()
                case "toggleBullet": return (editor as any).chain().focus().toggleBulletList().run()
                case "indent": return (editor as any).chain().focus().sinkListItem("listItem").run()
                case "outdent": return (editor as any).chain().focus().liftListItem("listItem").run()
                case "bold": return (editor as any).chain().focus().toggleBold().run()
                case "italic": return (editor as any).chain().focus().toggleItalic().run()
            }
        } catch { /* ignore runtime errors */ }
    }

    return (
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-white">
            <div className="flex items-center gap-2">
                <button aria-label="Bold" onClick={() => exec("bold")} className="p-2 rounded hover:bg-slate-100">
                    <Bold className="w-4 h-4" />
                </button>
                <button aria-label="Italic" onClick={() => exec("italic")} className="p-2 rounded hover:bg-slate-100">
                    <Italic className="w-4 h-4" />
                </button>
                <div className="h-6 w-px bg-slate-200 mx-2" />
                <button aria-pressed={isOrderedListActive} title="Toggle ordered list" onClick={() => exec("toggleOrdered")} className="p-2 rounded hover:bg-slate-100">
                    <ListOrdered className="w-4 h-4" />
                </button>
                <button title="Toggle bullet list" onClick={() => exec("toggleBullet")} className="p-2 rounded hover:bg-slate-100">
                    <List className="w-4 h-4" />
                </button>
                <select
                    value={currentListStyle}
                    onChange={(e) => onSetListStyle(e.target.value)}
                    className="ml-2 text-sm border rounded px-2 py-1 bg-white"
                    aria-label="List style"
                >
                    <option value="decimal">1. 2. 3.</option>
                    <option value="multidecimal">1.1.1</option>
                    <option value="upper-alpha">A. B. C.</option>
                    <option value="bullet">• ◦ ▪</option>
                </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <button title="Indent" onClick={() => exec("indent")} className="p-2 rounded hover:bg-slate-100">
                    <CornerDownRight className="w-4 h-4 rotate-90" />
                </button>
                <button title="Outdent" onClick={() => exec("outdent")} className="p-2 rounded hover:bg-slate-100">
                    <CornerDownLeft className="w-4 h-4 -rotate-90" />
                </button>

                <div className="h-6 w-px bg-slate-200 mx-2" />

                <button title="Move up" onClick={onMoveUp} className="p-2 rounded hover:bg-slate-100">↑</button>
                <button title="Move down" onClick={onMoveDown} className="p-2 rounded hover:bg-slate-100">↓</button>
                <button title="Delete" onClick={onDelete} className="p-2 rounded hover:bg-red-50 text-red-600">Del</button>
            </div>
        </div>
    )
}

export default ConsiderationToolbar