'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, ListOrdered, Download, FileText } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, Numbering, AbstractNumbering, ConcreteNumbering, Level, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

interface RichTextEditorProps {
    value?: string
    onChange?: (html: string) => void
}

const listStyles = [
    { value: 'list-decimal', label: '1.a.i', type: 'ordered' as const },
    { value: 'list-outline', label: 'I.A.1.a', type: 'ordered' as const },
    { value: 'list-multidecimal', label: '1.1.1', type: 'ordered' as const },
    { value: 'list-upper-alpha', label: 'A.B.C', type: 'ordered' as const },
    { value: 'list-bullet', label: '• ◦ ▪', type: 'bullet' as const },
]

export default function RichTextEditor({ value = '', onChange }: RichTextEditorProps) {
    const [currentStyle, setCurrentStyle] = useState('list-decimal')
    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
        editorProps: {
            attributes: {
                class: 'ProseMirror focus:outline-none min-h-[600px] p-16 bg-white text-slate-800 leading-relaxed',
            },
        },
    })

    useEffect(() => {
        if (editor && editor.getHTML() !== value) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    useEffect(() => {
        if (editor) {
            const dom = editor.view.dom
            listStyles.forEach(s => dom.classList.remove(s.value))
            dom.classList.add(currentStyle)
        }
    }, [currentStyle, editor])

    if (!editor) {
        return <div className="flex items-center justify-center min-h-[600px] bg-white">Loading editor...</div>
    }

    const handleStyleChange = (newStyle: string) => {
        const selected = listStyles.find(s => s.value === newStyle)!
        const isOrderedActive = editor.isActive('orderedList')
        const isBulletActive = editor.isActive('bulletList')

        setCurrentStyle(newStyle)

        if (selected.type === 'bullet') {
            if (!isBulletActive) editor.chain().focus().toggleBulletList().run()
            if (isOrderedActive) editor.chain().focus().toggleOrderedList().run()
        } else {
            if (!isOrderedActive) editor.chain().focus().toggleOrderedList().run()
            if (isBulletActive) editor.chain().focus().toggleBulletList().run()
        }
    }

    const handleToggleList = () => {
        if (editor.isActive('orderedList')) {
            editor.chain().focus().toggleOrderedList().run()
        } else if (editor.isActive('bulletList')) {
            editor.chain().focus().toggleBulletList().run()
        }
    }

    const getNumberingConfig = () => {
        const levels: Array<{ format: string; text: string }> = []

        if (currentStyle === 'list-bullet') {
            return {
                abstract: new AbstractNumbering({
                    abstractNumberingId: 0,
                    levels: [
                        new Level({ level: 0, format: 'bullet', text: '•' }),
                        new Level({ level: 1, format: 'bullet', text: '◦' }),
                        new Level({ level: 2, format: 'bullet', text: '▪' }),
                    ],
                }),
                concrete: new ConcreteNumbering({ concreteNumberingId: 0, abstractNumberingId: 0 }),
            }
        }

        if (currentStyle === 'list-decimal') {
            levels.push({ format: 'decimal', text: '%1.' })
            levels.push({ format: 'lowerLetter', text: '%2.' })
            levels.push({ format: 'lowerRoman', text: '%3.' })
        } else if (currentStyle === 'list-multidecimal') {
            levels.push({ format: 'decimal', text: '%1.' })
            levels.push({ format: 'decimal', text: '%2.' })
            levels.push({ format: 'decimal', text: '%3.' })
        } else if (currentStyle === 'list-outline') {
            levels.push({ format: 'upperRoman', text: '%1.' })
            levels.push({ format: 'upperLetter', text: '%2.' })
            levels.push({ format: 'decimal', text: '%3.' })
        } else if (currentStyle === 'list-upper-alpha') {
            levels.push({ format: 'upperLetter', text: '%1.' })
            levels.push({ format: 'upperLetter', text: '%2.' })
            levels.push({ format: 'upperLetter', text: '%3.' })
        }

        const levelObjects = levels.map((l, i) => new Level({
            level: i,
            format: l.format as any,
            text: l.text,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } },
        }))

        const abstract = new AbstractNumbering({
            abstractNumberingId: 0,
            levels: levelObjects,
        })

        const concrete = new ConcreteNumbering({
            concreteNumberingId: 0,
            abstractNumberingId: 0,
        })

        return { abstract, concrete }
    }

    const convertNodeToDocx = (node: any, level = 0): any[] => {
        if (!node) return []

        if (node.type === 'text') {
            const bold = node.marks?.some((m: any) => m.type === 'bold')
            const italic = node.marks?.some((m: any) => m.type === 'italic')
            return [new TextRun({ text: node.text || '', bold, italic })]
        }

        if (node.type === 'paragraph') {
            const children = node.content ? node.content.flatMap((child: any) => convertNodeToDocx(child, level)) : []
            return [new Paragraph({ children })]
        }

        if (node.type === 'listItem') {
            let itemChildren: any[] = []
            let nested: any[] = []

            node.content?.forEach((child: any) => {
                if (child.type === 'paragraph') {
                    itemChildren = convertNodeToDocx(child, level)
                } else if (child.type === 'bulletList' || child.type === 'orderedList') {
                    nested = child.content.flatMap((li: any) => convertNodeToDocx(li, level + 1))
                }
            })

            const paragraph = new Paragraph({
                children: itemChildren,
                numbering: { reference: 0, level },
            })

            return [paragraph, ...nested]
        }

        if (node.type === 'bulletList' || node.type === 'orderedList') {
            return node.content ? node.content.flatMap((li: any) => convertNodeToDocx(li, level)) : []
        }

        return []
    }

    const handleExportDocx = async () => {
        const json = editor.getJSON()
        const { abstract, concrete } = getNumberingConfig()

        const children = json.content ? json.content.flatMap((node: any) => convertNodeToDocx(node, 0)) : []

        const doc = new Document({
            numbering: {
                config: [abstract, concrete],
            },
            sections: [{
                properties: {},
                children,
            }],
        })

        const blob = await Packer.toBlob(doc)
        saveAs(blob, 'Pertimbangan.docx')
    }

    const isListActive = editor.isActive('orderedList') || editor.isActive('bulletList')

    return (
        <>
            {/* Toolbar Sticky */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('bold') ? 'bg-slate lesions-200' : ''}`}
                            >
                                <Bold className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}
                            >
                                <Italic className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleToggleList}
                                className={`p-2 rounded hover:bg-slate-100 ${isListActive ? 'bg-slate-200' : ''}`}
                            >
                                <ListOrdered className="h-4 w-4" />
                            </button>

                            <select
                                value={currentStyle}
                                onChange={(e) => handleStyleChange(e.target.value)}
                                className="px-3 py-1.5 text-xs font-medium border rounded-md bg-white hover:bg-slate-50"
                            >
                                {listStyles.map(style => (
                                    <option key={style.value} value={style.value}>
                                        {style.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleExportDocx}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#125d72] rounded-lg hover:bg-[#0e4b5d] transition-all"
                    >
                        <Download className="h-4 w-4" />
                        Export ke DOCX
                    </button>
                </div>
            </div>

            {/* Paper Layout */}
            <div className="bg-[#F0F2F5] min-h-screen flex justify-center items-start p-8">
                <div className="bg-white w-full max-w-4xl shadow-lg border border-slate-200">
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Custom CSS untuk Multilevel List (sama seperti tiptap-list-styles.css di proyek Anda) */}
            <style jsx global>{`
        .ProseMirror {
          outline: none !important;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: "Mulai ketik di sini...";
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        /* Reset list */
        .ProseMirror ol, .ProseMirror ul {
          list-style: none !important;
          padding-left: 0;
          margin: 0;
        }
        .ProseMirror li {
          position: relative;
        }
        .ProseMirror li > p {
          margin: 0;
        }

        /* Preset styles (diambil dari tiptap-list-styles.css) */
        /* list-decimal: 1.a.i */
        .list-decimal .ProseMirror ol { counter-reset: lvl1; }
        .list-decimal .ProseMirror ol > li { counter-increment: lvl1; }
        .list-decimal .ProseMirror ol > li::before { content: counter(lvl1, decimal) ". "; left: -2rem; position: absolute; }
        .list-decimal .ProseMirror ol > li > ol { counter-reset: lvl2; }
        .list-decimal .ProseMirror ol > li > ol > li { counter-increment: lvl2; }
        .list-decimal .ProseMirror ol > li > ol > li::before { content: counter(lvl2, lower-alpha) ". "; }

        /* list-multidecimal: 1.1.1 */
        .list-multidecimal .ProseMirror ol > li::before { content: counters(lvl1, ".") ". "; }

        /* list-bullet */
        .list-bullet .ProseMirror ul > li::before { content: "•"; left: -1.5rem; position: absolute; }
        .list-bullet .ProseMirror ul > li > ul > li::before { content: "◦"; }
        .list-bullet .ProseMirror ul > li > ul > li > ul > li::before { content: "▪"; }

        /* Tambahkan preset lain jika diperlukan */
      `}</style>
        </>
    )
}