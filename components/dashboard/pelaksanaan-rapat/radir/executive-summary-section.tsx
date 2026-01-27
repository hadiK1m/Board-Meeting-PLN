"use client"

import React, { useEffect, useMemo } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { FileText } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ReusableEditorToolbar from "./reusable-editor-toolbar"

interface ExecutiveSummarySectionProps {
    value: string
    onChange: (value: string) => void
    activeAgendaTitle?: string
}

export function ExecutiveSummarySection({
    value,
    onChange,
    activeAgendaTitle,
}: ExecutiveSummarySectionProps): React.ReactElement {
    const editor = useEditor({
        extensions: useMemo(
            () => [
                StarterKit.configure({
                    bulletList: { keepMarks: true },
                    orderedList: { keepMarks: true },
                }),
                Underline,
            ],
            []
        ),
        content: value,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: [
                    "prose",
                    "prose-sm",
                    "max-w-none",
                    "focus:outline-none",
                    "min-h-[600px]",
                    "p-10",
                    "prose-ul:list-disc",
                    "prose-ol:list-decimal",
                    "prose-ul:pl-6",
                    "prose-ol:pl-6",
                    "prose-li:marker:text-slate-500",
                ].join(" "), x
            },
        },
        onUpdate({ editor }) {
            onChange(editor.getHTML())
        },
    })

    useEffect(() => {
        if (!editor) return
        if (editor.getHTML() !== value) {
            editor.commands.setContent(value)
        }
    }, [editor, value])

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
                    <Badge className="text-[9px] font-black bg-emerald-50 text-emerald-700 uppercase">
                        GOOGLE DOCS MODE
                    </Badge>
                </div>
            </CardHeader>

            <ReusableEditorToolbar editor={editor} />

            <div className="p-6">
                <EditorContent editor={editor} />
            </div>
        </Card>
    )
}

export default ExecutiveSummarySection
