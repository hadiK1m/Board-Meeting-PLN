/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"
import { FileText } from "lucide-react"
import type { ConsiderationEditorHandle } from "./ConsiderationEditor"

interface ConsiderationsSectionProps {
    value: string
    setValue: (val: string) => void
    activeAgendaTitle?: string
}

const ConsiderationEditor = dynamic(() => import("./ConsiderationEditor"), {
    ssr: false,
    loading: () => (
        <div className="ProseMirror focus:outline-none min-h-75 bg-white rounded-md p-4 border border-slate-200 shadow-sm">
            Loading editor...
        </div>
    )
})

// Minimal fallback toolbar (ganti dengan import asli jika file tersedia)
type ToolbarProps = {
    activeAgendaTitle?: string
    onSetListStyle: (style: string) => void
    currentListStyle: string
    onToggleOrderedList: () => void
    onToggleBulletList: () => void
    isOrderedListActive: boolean
    onIndent: () => void
    onOutdent: () => void
    focusedIndex: number
    currentLevel: number
    totalItems: number
    onMoveUp: () => void
    onMoveDown: () => void
    onDelete: () => void
}
function ConsiderationToolbarFallback(props: ToolbarProps) {
    const {
        activeAgendaTitle,
        onToggleOrderedList,
        onToggleBulletList,
        onIndent,
        onOutdent,
    } = props

    return (
        <div className="flex items-center gap-2 p-2 border-b">
            <div className="text-sm font-medium">{activeAgendaTitle ?? "Considerations"}</div>
            <div className="ml-auto flex gap-1">
                <button onClick={onToggleOrderedList} type="button" className="btn">OL</button>
                <button onClick={onToggleBulletList} type="button" className="btn">UL</button>
                <button onClick={onIndent} type="button" className="btn">→</button>
                <button onClick={onOutdent} type="button" className="btn">←</button>
            </div>
        </div>
    )
}

export function ConsiderationsSection({ value, setValue, activeAgendaTitle }: ConsiderationsSectionProps) {
    // ref yang hanya untuk mendapatkan handle editor dari component child
    const editorRef = useRef<ConsiderationEditorHandle | null>(null);
    const [listStyle, setListStyle] = useState("list-decimal");
    const [isOrderedListActive, setIsOrderedListActive] = useState(false);

    const getEditor = (): any | null => {
        return editorRef.current?.editor ?? null;
    };

    // Handler untuk toggle ordered list
    const handleToggleOrderedList = () => {
        const editor = getEditor();
        if (editor) {
            (editor as any).chain().focus().toggleOrderedList().run();
        }
    };

    // Handler untuk toggle bullet list
    const handleToggleBulletList = () => {
        const editor = getEditor();
        if (editor) {
            (editor as any).chain().focus().toggleBulletList().run();
        }
    };

    // Handler untuk mengubah list style
    const handleSetListStyle = (style: string) => {
        const fullStyle = style.startsWith('list-') ? style : `list-${style}`;
        setListStyle(fullStyle);
    };

    // Handler indent/outdent
    const handleIndent = () => {
        const editor = getEditor();
        if (editor) {
            (editor as any).chain().focus().sinkListItem('listItem').run();
        }
    };

    const handleOutdent = () => {
        const editor = getEditor();
        if (editor) {
            (editor as any).chain().focus().liftListItem('listItem').run();
        }
    };

    // Update state dari editor
    useEffect(() => {
        const checkEditorState = () => {
            const editor = getEditor();
            try {
                const active = editor && typeof editor.isActive === "function" ? editor.isActive('orderedList') : false;
                setIsOrderedListActive(active);
            } catch {
                setIsOrderedListActive(false);
            }
        };

        const interval = setInterval(checkEditorState, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-200">
            <CardHeader className="bg-white border-b border-slate-100 py-4 px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#125d72]/10 rounded-lg">
                            <FileText className="h-5 w-5 text-[#125d72]" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-black uppercase tracking-widest text-[#125d72]">
                                Penyusunan Risalah / Ringkasan Eksekutif
                            </CardTitle>
                            {activeAgendaTitle && (
                                <p className="text-xs text-slate-500 mt-1 italic">
                                    Agenda: <span className="font-medium">{activeAgendaTitle}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <Badge
                        variant="secondary"
                        className="text-[9px] font-black bg-emerald-50 text-emerald-700 uppercase"
                    >
                        GOOGLE DOCS MODE
                    </Badge>
                </div>
            </CardHeader>

            {/* Toolbar (fallback) */}
            <ConsiderationToolbarFallback
                activeAgendaTitle={activeAgendaTitle}
                onSetListStyle={handleSetListStyle}
                currentListStyle={listStyle.replace("list-", "")}
                onToggleOrderedList={handleToggleOrderedList}
                onToggleBulletList={handleToggleBulletList}
                isOrderedListActive={isOrderedListActive}
                onIndent={handleIndent}
                onOutdent={handleOutdent}
                focusedIndex={0}
                currentLevel={0}
                totalItems={1}
                onMoveUp={() => { }}
                onMoveDown={() => { }}
                onDelete={() => { }}
            />

            <div>
                {/* pasangkan ref ke komponen editor, bukan ke div DOM */}
                <ConsiderationEditor value={value} onChange={setValue} ref={editorRef} />
            </div>
        </Card>
    )
}