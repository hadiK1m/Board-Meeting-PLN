"use client"

import React, { useRef, useState } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { FileText } from "lucide-react"
import type { ConsiderationEditorHandle } from "./ConsiderationEditor"
import ReusableEditorToolbar, { type EditorLike } from "./reusable-editor-toolbar"

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
    ),
})

export function ConsiderationsSection({
    value,
    setValue,
    activeAgendaTitle,
}: ConsiderationsSectionProps): React.ReactElement {
    const editorRef = useRef<ConsiderationEditorHandle | null>(null)
    const [listStyle, setListStyle] = useState<string>("list-decimal")

    const getEditor = (): EditorLike | null => {
        return editorRef.current?.editor ?? null
    }

    const handleSetListStyle = (style: string): void => {
        const fullStyle = style.startsWith("list-") ? style : `list-${style}`
        setListStyle(fullStyle)

        try {
            const dom = (getEditor() as unknown as { view?: { dom?: HTMLElement } })?.view?.dom
            if (dom) {
                ["list-decimal", "list-multidecimal", "list-upper-alpha", "list-bullet"].forEach((c) =>
                    dom.classList.remove(c)
                )
                dom.classList.add(fullStyle)
            }
        } catch {
            // ignore
        }
    }

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-200">
            <CardHeader className="bg-white border-b border-slate-100 py-4 px-6">
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
            </CardHeader>

            <ReusableEditorToolbar
                editorRef={editorRef as React.RefObject<{ editor?: EditorLike | null }>}
                currentListStyle={listStyle}
                onSetListStyle={handleSetListStyle}
            />

            <ConsiderationEditor value={value} onChange={setValue} ref={editorRef} />
        </Card>
    )
}

export default ConsiderationsSection
