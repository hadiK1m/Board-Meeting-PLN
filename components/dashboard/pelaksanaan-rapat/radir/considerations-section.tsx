/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"
import { FileText } from "lucide-react"
import type { ConsiderationEditorHandle } from "./ConsiderationEditor"
import ConsiderationToolbar from "./consideration-toolbar"

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

export function ConsiderationsSection({ value, setValue, activeAgendaTitle }: ConsiderationsSectionProps) {
    const editorRef = useRef<ConsiderationEditorHandle | null>(null)
    const [listStyle, setListStyle] = useState("list-decimal")
    const [isOrderedListActive, setIsOrderedListActive] = useState(false)

    const getEditor = (): any | null => {
        return editorRef.current?.editor ?? null
    }


    const handleSetListStyle = (style: string) => {
        const fullStyle = style.startsWith("list-") ? style : `list-${style}`
        setListStyle(fullStyle)
        // update DOM class on editor if available
        const editor = getEditor()
        if (editor && (editor as any).view?.dom) {
            const dom = (editor as any).view.dom as HTMLElement
            ["list-decimal", "list-outline", "list-multidecimal", "list-upper-alpha", "list-bullet"].forEach(s => dom.classList.remove(s))
            dom.classList.add(fullStyle)
        }
    }



    useEffect(() => {
        const checkEditorState = () => {
            const editor = getEditor()
            try {
                const active = editor && typeof editor.isActive === "function" ? editor.isActive("orderedList") : false
                setIsOrderedListActive(active)
            } catch {
                setIsOrderedListActive(false)
            }
        }

        const interval = setInterval(checkEditorState, 300)
        return () => clearInterval(interval)
    }, [])

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
                                DASAR PERTIMBANGAN
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

            <ConsiderationToolbar
                editorRef={editorRef}
                currentListStyle={listStyle.replace("list-", "")}
                onSetListStyle={handleSetListStyle}
                isOrderedListActive={isOrderedListActive}
                onMoveUp={() => { }}
                onMoveDown={() => { }}
                onDelete={() => { }}
            />

            <div>
                <ConsiderationEditor value={value} onChange={setValue} ref={editorRef} />
            </div>
        </Card>
    )
}

export default ConsiderationsSection