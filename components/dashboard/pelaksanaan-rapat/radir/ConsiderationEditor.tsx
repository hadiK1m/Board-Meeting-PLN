/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// interface props
interface RichTextEditorProps {
    value?: string
    onChange?: (html: string) => void
}

// forwarded ref shape
export type ConsiderationEditorHandle = {
    editor: any | null
}

const RichTextEditor = forwardRef<ConsiderationEditorHandle, RichTextEditorProps>(function RichTextEditor(
    { value = '', onChange },
    ref
) {
    // tambahkan immediatelyRender: false di opsi useEditor
    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        // penting: mencegah Tiptap merender saat SSR
        immediatelyRender: false,
        onUpdate: ({ editor }: { editor: any }) => {
            if (editor && typeof editor.getHTML === 'function') {
                onChange?.(editor.getHTML())
            }
        },
        editorProps: {
            attributes: {
                class: 'ProseMirror focus:outline-none min-h-[600px] p-16 bg-white text-slate-800 leading-relaxed',
            },
        },
    }) as any

    useImperativeHandle(ref, () => ({ editor }), [editor])

    React.useEffect(() => {
        if (editor && typeof editor.getHTML === 'function' && editor.getHTML() !== value) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    if (!editor) {
        return <div className="flex items-center justify-center min-h-150 bg-white">Loading editor...</div>
    }

    return (
        <div>
            <EditorContent editor={editor} />
        </div>
    )
})

export default RichTextEditor