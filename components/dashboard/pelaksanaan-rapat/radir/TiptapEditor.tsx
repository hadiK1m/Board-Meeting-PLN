/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor as CoreEditor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import { CustomOrderedList } from "./CustomOrderedList";

export interface TiptapEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    editorRef?: (editor: CoreEditor | null) => void;
    proseMirrorRef?: React.RefObject<HTMLDivElement | null>;
    listStyle?: string;
}

export default function TiptapEditor({
    value,
    onChange,
    editorRef,
    proseMirrorRef,
    listStyle = "list-decimal",
}: TiptapEditorProps) {
    const [isMounted, setIsMounted] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                orderedList: false, // Nonaktifkan default ordered list
            }),
            BulletList,
            CustomOrderedList, // Gunakan custom ordered list
            ListItem,
        ],
        content: value || "",
        onUpdate({ editor }) {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `ProseMirror focus:outline-none min-h-[300px] bg-white rounded-md p-4 border border-slate-200 shadow-sm ${listStyle}`,
            },
            handleKeyDown: (_view: any, event: KeyboardEvent) => {
                if (!editor) return false;

                // Tab = indent
                if (event.key === "Tab" && !event.shiftKey) {
                    event.preventDefault();

                    if (editor.isActive('listItem')) {
                        editor.chain().focus().sinkListItem('listItem').run();
                        return true;
                    }
                    else if (editor.isActive('paragraph')) {
                        editor.chain().focus().toggleOrderedList().run();
                        return true;
                    }
                    return false;
                }

                // Shift + Tab = outdent
                if (event.key === "Tab" && event.shiftKey) {
                    event.preventDefault();
                    if (editor.isActive('listItem')) {
                        editor.chain().focus().liftListItem('listItem').run();
                        return true;
                    }
                    return false;
                }

                return false;
            },
        },
        immediatelyRender: false,
    });

    // Update class ketika listStyle berubah
    useEffect(() => {
        if (editor?.view?.dom) {
            const proseMirror = editor.view.dom;

            // Hapus semua class list-style sebelumnya
            const listClasses = [
                'list-decimal',
                'list-outline',
                'list-multidecimal',
                'list-upper-alpha',
                'list-bullet'
            ];

            listClasses.forEach(cls => {
                if (proseMirror.classList.contains(cls)) {
                    proseMirror.classList.remove(cls);
                }
            });

            // Tambah class baru
            if (listStyle) {
                proseMirror.classList.add(listStyle);
            }
        }
    }, [listStyle, editor]);

    // Expose editor ke parent
    useEffect(() => {
        if (editor && proseMirrorRef) {
            (proseMirrorRef.current as any).editor = editor;
        }

        if (editor && editorRef) {
            editorRef(editor);
        }
    }, [editor, editorRef, proseMirrorRef]);

    // Set mounted setelah render pertama
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Jika belum mounted, render placeholder
    if (!isMounted || !editor) {
        return (
            <div className={`ProseMirror focus:outline-none min-h-[300px] bg-white rounded-md p-4 border border-slate-200 shadow-sm ${listStyle}`}>
                Loading editor...
            </div>
        );
    }

    return <EditorContent editor={editor} ref={proseMirrorRef} />;
}