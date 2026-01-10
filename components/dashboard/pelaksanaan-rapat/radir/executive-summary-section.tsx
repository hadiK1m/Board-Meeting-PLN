// components/dashboard/pelaksanaan-rapat/radir/executive-summary-section.tsx
"use client"

import React from "react"
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
    activeAgendaTitle?: string // Opsional: untuk menampilkan judul agenda aktif
}

export function ExecutiveSummarySection({
    value,
    onChange,
    activeAgendaTitle,
}: ExecutiveSummarySectionProps) {
    const editor = useEditor({
        extensions: [StarterKit, Underline],
        content: value,
        immediatelyRender: false, // Hindari error hydration Next.js
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[600px] p-10 md:p-16 max-w-none text-slate-800 leading-relaxed outline-none",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Sinkronisasi nilai dari luar (penting saat switch agenda)
    React.useEffect(() => {
        if (editor && editor.getHTML() !== value) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    if (!editor) {
        return (
            <div className="w-full h-[600px] bg-white border border-slate-200 rounded-lg animate-pulse flex items-center justify-center">
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">
                    Memuat Editor Risalah...
                </p>
            </div>
        )
    }

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-200">
            {/* HEADER */}
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

            {/* TOOLBAR FORMATTING */}
            <div className="bg-white border-b p-2 flex flex-wrap gap-1 items-center px-6 sticky top-0 z-20 shadow-sm">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 p-0"
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 p-0"
                >
                    <Redo className="h-4 w-4" />
                </Button>

                <div className="w-px h-5 bg-slate-200 mx-2" />

                <Button
                    variant={editor.isActive("bold") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive("bold") ? "bg-slate-100 text-[#14a2ba]" : ""}`}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive("italic") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive("italic") ? "bg-slate-100 text-[#14a2ba]" : ""}`}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive("underline") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive("underline") ? "bg-slate-100 text-[#14a2ba]" : ""}`}
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>

                <div className="w-px h-5 bg-slate-200 mx-2" />

                <Button
                    variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`h-8 px-2 flex gap-1 ${editor.isActive("heading", { level: 2 }) ? "text-[#14a2ba]" : ""}`}
                >
                    <Heading2 className="h-4 w-4" />
                    <span className="text-[9px] font-bold">JUDUL</span>
                </Button>

                <Button
                    variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive("bulletList") ? "text-[#14a2ba]" : ""}
                >
                    <List className="h-4 w-4" />
                </Button>

                <Button
                    variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive("orderedList") ? "text-[#14a2ba]" : ""}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="w-px h-5 bg-slate-200 mx-2" />

                <Button
                    variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`h-8 px-2 flex gap-1 ${editor.isActive("blockquote") ? "text-[#14a2ba]" : ""}`}
                >
                    <Quote className="h-4 w-4" />
                    <span className="text-[9px] font-bold">ARAHAN</span>
                </Button>
            </div>

            {/* EDITOR CANVAS */}
            <CardContent className="p-4 md:p-12 flex justify-center bg-slate-100/30">
                <div className="w-full max-w-4xl bg-white shadow-2xl border border-slate-200 min-h-[842px] relative transition-all">
                    <EditorContent editor={editor} />
                </div>
            </CardContent>

            {/* FOOTER INFO */}
            <div className="bg-white px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <AlignLeft className="h-3.5 w-3.5" />
                        <span>HTML FORMAT</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5" />
                        <span>{editor.getText().length} KARAKTER</span>
                    </div>
                </div>
                <p className="text-[9px] font-bold italic">
                    Ringkasan ini akan menjadi inti lembar isi risalah rapat.
                </p>
            </div>

            {/* GLOBAL CSS PROSEMIRROR */}
            <style jsx global>{`
                .ProseMirror {
                    outline: none !important;
                }
                .ProseMirror ul {
                    list-style-type: disc !important;
                    padding-left: 2rem !important;
                    margin: 1rem 0;
                }
                .ProseMirror ol {
                    list-style-type: decimal !important;
                    padding-left: 2rem !important;
                    margin: 1rem 0;
                }
                .ProseMirror li p {
                    margin: 0 !important;
                }
                .ProseMirror h2 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin: 1.5rem 0 1rem;
                    color: #125d72;
                }
                .ProseMirror blockquote {
                    border-left: 4px solid #14a2ba;
                    padding-left: 1.5rem;
                    font-style: italic;
                    color: #475569;
                    margin: 1.5rem 0;
                }
                .ProseMirror p {
                    margin-bottom: 1rem;
                    line-height: 1.8;
                }
            `}</style>
        </Card>
    )
}   