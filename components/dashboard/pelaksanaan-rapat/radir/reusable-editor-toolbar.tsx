"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Minimal chainable commands we need from TipTap
 */
type ChainableCommands = {
    focus?: () => ChainableCommands
    toggleBold?: () => { run?: () => void }
    toggleItalic?: () => { run?: () => void }
    toggleUnderline?: () => { run?: () => void }
    toggleHeading?: (opts: { level: number }) => { run?: () => void }
    toggleBulletList?: () => { run?: () => void }
    toggleOrderedList?: () => { run?: () => void }
}

/**
 * Minimal editor surface used by toolbar
 */
export type EditorLike = {
    chain?: () => ChainableCommands | undefined
    isActive?: (name: string, attrs?: Record<string, unknown>) => boolean
    on?: (event: string, cb: () => void) => void
    off?: (event: string, cb: () => void) => void
}

export interface ReusableEditorToolbarProps {
    editor?: EditorLike | null
    editorRef?: React.RefObject<{ editor?: EditorLike | null } | null>
    currentListStyle?: string
    onSetListStyle?: (style: string) => void
}

export default function ReusableEditorToolbar({
    editor,
    editorRef,
    currentListStyle = "list-decimal",
    onSetListStyle,
}: ReusableEditorToolbarProps): React.ReactElement {
    const resolveEditor = useCallback((): EditorLike | null => {
        return editor ?? editorRef?.current?.editor ?? null
    }, [editor, editorRef])

    const run = useCallback((fn: (c: ChainableCommands) => void): void => {
        const ed = resolveEditor()
        const chain = ed?.chain?.()
        if (!chain) return
        try {
            fn(chain)
        } catch {
            // ignore editor runtime errors
        }
    }, [resolveEditor])

    /**
     * Snapshot editor active state
     * (avoid accessing refs during render)
     */
    const [active, setActive] = useState<Record<string, boolean>>({
        bold: false,
        italic: false,
        underline: false,
        bulletList: false,
        orderedList: false,
        heading2: false,
    })

    useEffect(() => {
        const ed = resolveEditor()
        if (!ed?.isActive) return

        const update = (): void => {
            try {
                setActive({
                    bold: ed.isActive?.("bold") ?? false,
                    italic: ed.isActive?.("italic") ?? false,
                    underline: ed.isActive?.("underline") ?? false,
                    bulletList: ed.isActive?.("bulletList") ?? false,
                    orderedList: ed.isActive?.("orderedList") ?? false,
                    heading2: ed.isActive?.("heading", { level: 2 }) ?? false,
                })
            } catch {
                // ignore
            }
        }

        update()
        ed.on?.("selectionUpdate", update)
        ed.on?.("transaction", update)

        return () => {
            ed.off?.("selectionUpdate", update)
            ed.off?.("transaction", update)
        }
    }, [resolveEditor])

    const handleListStyleChange = (value: string): void => {
        const normalized = value.startsWith("list-") ? value : `list-${value}`
        onSetListStyle?.(normalized)
    }

    return (
        <div className="bg-white border-b p-2 flex flex-wrap gap-1 items-center px-6 sticky top-0 z-20 shadow-sm">
            {/* Bold */}
            <Button
                type="button"
                variant={active.bold ? "secondary" : "ghost"}
                size="sm"
                onMouseDown={(e) => {
                    e.preventDefault()
                    run((c) => c.focus?.().toggleBold?.().run?.())
                }}
                className={`h-8 w-8 p-0 ${active.bold ? "bg-slate-100 text-[#14a2ba]" : ""}`}
                aria-pressed={active.bold}
                aria-label="Bold"
            >
                <Bold className="h-4 w-4" />
            </Button>

            {/* Italic */}
            <Button
                type="button"
                variant={active.italic ? "secondary" : "ghost"}
                size="sm"
                onMouseDown={(e) => {
                    e.preventDefault()
                    run((c) => c.focus?.().toggleItalic?.().run?.())
                }}
                className={`h-8 w-8 p-0 ${active.italic ? "bg-slate-100 text-[#14a2ba]" : ""}`}
                aria-pressed={active.italic}
                aria-label="Italic"
            >
                <Italic className="h-4 w-4" />
            </Button>

            {/* Underline */}
            <Button
                type="button"
                variant={active.underline ? "secondary" : "ghost"}
                size="sm"
                onMouseDown={(e) => {
                    e.preventDefault()
                    run((c) => c.focus?.().toggleUnderline?.().run?.())
                }}
                className={`h-8 w-8 p-0 ${active.underline ? "bg-slate-100 text-[#14a2ba]" : ""}`}
                aria-pressed={active.underline}
                aria-label="Underline"
            >
                <UnderlineIcon className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-slate-200 mx-2" />

            {/* Heading 2 */}
            <Button
                type="button"
                variant={active.heading2 ? "secondary" : "ghost"}
                size="sm"
                onMouseDown={(e) => {
                    e.preventDefault()
                    run((c) => c.focus?.().toggleHeading?.({ level: 2 }).run?.())
                }}
                className={`h-8 px-2 flex gap-1 ${active.heading2 ? "text-[#14a2ba]" : ""}`}
                aria-label="Heading 2"
            >
                <Heading2 className="h-4 w-4" />
                <span className="text-[9px] font-bold">JUDUL</span>
            </Button>

            {/* Bullet List */}
            <Button
                type="button"
                variant={active.bulletList ? "secondary" : "ghost"}
                size="sm"
                onMouseDown={(e) => {
                    e.preventDefault()
                    run((c) => c.focus?.().toggleBulletList?.().run?.())
                }}
                className={active.bulletList ? "text-[#14a2ba]" : ""}
                aria-pressed={active.bulletList}
                aria-label="Bullet list"
            >
                <List className="h-4 w-4" />
            </Button>

            {/* Ordered List */}
            <Button
                type="button"
                variant={active.orderedList ? "secondary" : "ghost"}
                size="sm"
                onMouseDown={(e) => {
                    e.preventDefault()
                    run((c) => c.focus?.().toggleOrderedList?.().run?.())
                }}
                className={active.orderedList ? "text-[#14a2ba]" : ""}
                aria-pressed={active.orderedList}
                aria-label="Ordered list"
            >
                <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-slate-200 mx-2" />

            {/* List style selector */}
            <select
                aria-label="List style"
                value={currentListStyle.replace(/^list-/, "")}
                onChange={(e) => handleListStyleChange(e.target.value)}
                className="ml-2 text-sm border rounded px-2 py-1 bg-white"
            >
                <option value="decimal">1. 2. 3.</option>
                <option value="multidecimal">1.1.1</option>
                <option value="upper-alpha">A. B. C.</option>
                <option value="bullet">• ◦ ▪</option>
            </select>
        </div>
    )
}
