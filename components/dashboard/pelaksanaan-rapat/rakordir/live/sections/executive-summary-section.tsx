/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import {
    FileText,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading2,
    Quote,
    Undo,
    Redo,
    AlignLeft,
    StickyNote,
    Info,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ExecutiveSummarySectionProps {
    value: string
    onChange: (value: string) => void
    activeAgendaTitle?: string
}

export function ExecutiveSummarySection({
    value,
    onChange,
    activeAgendaTitle,
}: ExecutiveSummarySectionProps) {
    const editor = useEditor({
        extensions: [StarterKit, Underline],
        content: value,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-6 py-4 text-slate-700 font-medium",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Update content jika agenda aktif berpindah
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    if (!editor) return null

    const MenuButton = ({
        onClick,
        isActive,
        children,
        tooltip
    }: {
        onClick: () => void;
        isActive?: boolean;
        children: React.ReactNode;
        tooltip: string;
    }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className={`h-8 w-8 p-0 rounded-lg transition-all ${isActive
                    ? "bg-[#125d72] text-white hover:bg-[#125d72] shadow-md shadow-[#125d72]/20"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
            title={tooltip}
        >
            {children}
        </Button>
    )

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#125d72] rounded-xl shadow-lg shadow-[#125d72]/20">
                        <StickyNote className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#125d72]">
                            Ringkasan Pembahasan
                        </CardTitle>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5 italic truncate max-w-[400px]">
                            {activeAgendaTitle || "Materi Agenda"}
                        </p>
                    </div>
                </div>
                <Badge className="bg-[#14a2ba]/10 text-[#14a2ba] border-none text-[9px] font-black uppercase px-3 py-1">
                    Rich Text Editor
                </Badge>
            </CardHeader>

            {/* TOOLBAR EDITOR */}
            <div className="bg-white border-b border-slate-100 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    tooltip="Tebal (Ctrl+B)"
                >
                    <Bold className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    tooltip="Miring (Ctrl+I)"
                >
                    <Italic className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    tooltip="Garis Bawah (Ctrl+U)"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </MenuButton>

                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    tooltip="Bullet List"
                >
                    <List className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    tooltip="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </MenuButton>

                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive("heading", { level: 2 })}
                    tooltip="Heading"
                >
                    <Heading2 className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    tooltip="Kutipan/Pernyataan"
                >
                    <Quote className="h-4 w-4" />
                </MenuButton>

                <div className="flex-1" />

                <MenuButton onClick={() => editor.chain().focus().undo().run()} tooltip="Undo">
                    <Undo className="h-4 w-4" />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().redo().run()} tooltip="Redo">
                    <Redo className="h-4 w-4" />
                </MenuButton>
            </div>

            <CardContent className="p-0 bg-slate-50/10">
                <EditorContent editor={editor} className="min-h-[300px] cursor-text" />
            </CardContent>

            {/* FOOTER INFO */}
            <div className="bg-slate-50/50 border-t border-slate-100 p-4 flex items-start gap-3">
                <div className="p-1.5 bg-[#14a2ba]/10 rounded-lg shrink-0">
                    <Info className="h-3.5 w-3.5 text-[#14a2ba]" />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase italic leading-relaxed tracking-tight">
                    Tuliskan ringkasan inti dari pembahasan agenda ini secara lugas.
                    Narasi ini akan muncul di bagian isi Notulensi Rakordir.
                </p>
            </div>

            {/* STYLES PROSEMIRROR (Inject CSS untuk render Tiptap) */}
            <style jsx global>{`
                .ProseMirror {
                    outline: none !important;
                }
                .ProseMirror ul {
                    list-style-type: disc !important;
                    padding-left: 1.5rem !important;
                    margin: 1rem 0;
                }
                .ProseMirror ol {
                    list-style-type: decimal !important;
                    padding-left: 1.5rem !important;
                    margin: 1rem 0;
                }
                .ProseMirror blockquote {
                    border-left: 4px solid #14a2ba;
                    padding-left: 1rem;
                    font-style: italic;
                    color: #64748b;
                    margin: 1.5rem 0;
                }
                .ProseMirror h2 {
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin: 1.5rem 0 0.75rem;
                    color: #125d72;
                }
                .ProseMirror p {
                    margin-bottom: 0.75rem;
                    line-height: 1.6;
                }
            `}</style>
        </Card>
    )
}