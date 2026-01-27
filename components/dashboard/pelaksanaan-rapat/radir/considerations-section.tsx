"use client"

import React, { useEffect, useState } from "react"
import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import {
    Bold, Italic, List, ListOrdered,
    Indent, Outdent, Download, Loader2
} from "lucide-react"
import { Packer, Document, Paragraph, TextRun, LevelFormat, AlignmentType } from "docx"
import { saveAs } from "file-saver"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ----------------------------------------------------------------------
// 1. DEFINISI TIPE & INTERFACE
// ----------------------------------------------------------------------

interface ConsiderationsSectionProps {
    value: string
    setValue: (val: string) => void
    activeAgendaTitle?: string
}

interface ToolbarButtonProps {
    onClick: () => void
    isActive?: boolean
    isDisabled?: boolean
    icon: React.ReactNode
    tooltip: string
}

// ----------------------------------------------------------------------
// 2. KOMPONEN UTAMA
// ----------------------------------------------------------------------

export function ConsiderationsSection({ value, setValue, activeAgendaTitle }: ConsiderationsSectionProps) {
    const [isExporting, setIsExporting] = useState(false)

    // Inisialisasi Editor Tiptap
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                codeBlock: false,
            }),
            Underline,
        ],
        content: value || "",
        editorProps: {
            attributes: {
                class: "prose prose-sm md:prose-base focus:outline-none min-h-[400px] max-w-none px-8 py-6 bg-white",
            },
        },
        // FIX: Tambahkan tipe eksplisit untuk editor
        onUpdate: ({ editor }: { editor: Editor }) => {
            setValue(editor.getHTML())
        },
    })

    // Sinkronisasi value eksternal
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    // Fungsi Export ke DOCX
    const handleExportToDocx = async () => {
        if (!editor) return
        setIsExporting(true)

        try {
            const jsonContent = editor.getJSON()
            const docChildren = parseTiptapJsonToDocx(jsonContent)

            const doc = new Document({
                numbering: {
                    config: [
                        {
                            reference: "default-numbering",
                            levels: [
                                { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
                                { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
                                { level: 2, format: LevelFormat.LOWER_ROMAN, text: "%3.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 2160, hanging: 360 } } } },
                            ],
                        },
                        {
                            reference: "default-bullet",
                            levels: [
                                { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
                                { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
                                { level: 2, format: LevelFormat.BULLET, text: "▪", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 2160, hanging: 360 } } } },
                            ],
                        },
                    ],
                },
                sections: [
                    {
                        properties: {},
                        children: [
                            new Paragraph({
                                text: activeAgendaTitle || "Pertimbangan Rapat",
                                heading: "Heading1",
                                spacing: { after: 400 },
                            }),
                            ...docChildren,
                        ],
                    },
                ],
            })

            const blob = await Packer.toBlob(doc)
            saveAs(blob, `Pertimbangan-${activeAgendaTitle ? activeAgendaTitle.substring(0, 20) : "Draft"}.docx`)

        } catch (error) {
            console.error("Export failed:", error)
            alert("Gagal melakukan export dokumen.")
        } finally {
            setIsExporting(false)
        }
    }

    if (!editor) {
        return <div className="h-64 flex items-center justify-center bg-slate-50 border rounded-xl animate-pulse">Loading Editor...</div>
    }

    // Helper untuk casting chain commands agar TS tidak error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = editor.chain().focus() as any

    return (
        <Card className="flex flex-col h-full overflow-hidden border-slate-200 shadow-sm bg-[#F9FAFB]">
            {/* TOOLBAR */}
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 p-2 bg-white border-b border-slate-200 shadow-sm">

                <ToolbarButton
                    onClick={() => chain.toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    icon={<Bold className="w-4 h-4" />}
                    tooltip="Bold (Ctrl+B)"
                />
                <ToolbarButton
                    onClick={() => chain.toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    icon={<Italic className="w-4 h-4" />}
                    tooltip="Italic (Ctrl+I)"
                />
                <div className="w-px h-6 mx-1 bg-slate-200" />

                <ToolbarButton
                    onClick={() => chain.toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    icon={<List className="w-4 h-4" />}
                    tooltip="Bullet List"
                />
                <ToolbarButton
                    onClick={() => chain.toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    icon={<ListOrdered className="w-4 h-4" />}
                    tooltip="Numbered List"
                />

                <ToolbarButton
                    onClick={() => chain.sinkListItem('listItem').run()}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    isDisabled={!(editor as any).can().sinkListItem('listItem')}
                    icon={<Indent className="w-4 h-4" />}
                    tooltip="Indent (Tab)"
                />
                <ToolbarButton
                    onClick={() => chain.liftListItem('listItem').run()}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    isDisabled={!(editor as any).can().liftListItem('listItem')}
                    icon={<Outdent className="w-4 h-4" />}
                    tooltip="Outdent (Shift+Tab)"
                />

                <div className="flex-1" />

                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportToDocx}
                    disabled={isExporting}
                    className="h-8 text-xs gap-2 border-slate-300 text-slate-600 hover:text-[#125d72] hover:bg-[#125d72]/5"
                >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Export DOCX
                </Button>
            </div>

            {/* EDITOR AREA */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F0F2F5] cursor-text" onClick={() => editor.chain().focus().run()}>
                {/* 
                   Note: Menggunakan style manual width/height agar mirip kertas A4. 
                   Warning Tailwind diabaikan karena ini kebutuhan presisi visual.
                */}
                <div className="mx-auto max-w-[816px] min-h-[1056px] bg-white shadow-sm border border-[#e1e3e6]">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </Card>
    )
}

// ----------------------------------------------------------------------
// 3. HELPER COMPONENTS
// ----------------------------------------------------------------------

function ToolbarButton({ onClick, isActive, isDisabled, icon, tooltip }: ToolbarButtonProps) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={isDisabled}
            className={cn(
                "h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                isActive && "bg-slate-200 text-[#125d72] font-bold",
                isDisabled && "opacity-30 cursor-not-allowed"
            )}
            title={tooltip}
        >
            {icon}
        </Button>
    )
}

// ----------------------------------------------------------------------
// 4. LOGIKA EXPORT DOCX
// ----------------------------------------------------------------------

function parseTiptapJsonToDocx(content: JSONContent): Paragraph[] {
    const docxNodes: Paragraph[] = []

    if (!content?.content) return docxNodes

    content.content.forEach((node) => {
        if (node.type === "paragraph") {
            docxNodes.push(createParagraphFromNode(node))
        } else if (node.type === "bulletList" || node.type === "orderedList") {
            const listItems = processList(node, 0, node.type === "orderedList" ? "default-numbering" : "default-bullet")
            docxNodes.push(...listItems)
        }
    })

    return docxNodes
}

function createParagraphFromNode(node: JSONContent, numbering?: { reference: string, level: number }): Paragraph {
    const children: TextRun[] = []

    if (node.content) {
        node.content.forEach((textNode) => {
            if (textNode.type === "text" && textNode.text) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const marks = textNode.marks as any[] | undefined
                children.push(new TextRun({
                    text: textNode.text,
                    bold: marks?.some((m) => m.type === "bold"),
                    italics: marks?.some((m) => m.type === "italic"),
                }))
            }
        })
    }

    return new Paragraph({
        children,
        numbering: numbering,
        spacing: { after: 120, line: 360 },
    })
}

function processList(listNode: JSONContent, level: number, ref: string): Paragraph[] {
    const paragraphs: Paragraph[] = []

    if (!listNode.content) return paragraphs

    listNode.content.forEach((listItem) => {
        if (listItem.type === "listItem" && listItem.content) {
            listItem.content.forEach((child) => {
                if (child.type === "paragraph") {
                    paragraphs.push(createParagraphFromNode(child, { reference: ref, level: level }))
                } else if (child.type === "bulletList" || child.type === "orderedList") {
                    const nextRef = child.type === "orderedList" ? "default-numbering" : "default-bullet"
                    paragraphs.push(...processList(child, level + 1, nextRef))
                }
            })
        }
    })

    return paragraphs
}