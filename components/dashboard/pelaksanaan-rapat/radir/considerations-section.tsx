/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ConsiderationToolbar } from "./consideration-toolbar"
import { EditorContent, useEditor } from "@tiptap/react"
import type { Editor as CoreEditor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import BulletList from "@tiptap/extension-bullet-list"
import ListItem from "@tiptap/extension-list-item"
import { mergeAttributes } from '@tiptap/core'
import { OrderedList as TiptapOrderedList } from '@tiptap/extension-ordered-list'

interface ConsiderationsSectionProps {
    value: string
    setValue: (val: string) => void
    activeAgendaTitle?: string
}

// Inline CustomOrderedList extension
const CustomOrderedList = TiptapOrderedList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            class: {
                default: 'ordered-list',
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => ({
                    class: attributes.class,
                }),
            },
        }
    },

    renderHTML({ HTMLAttributes }) {
        return ['ol', mergeAttributes(HTMLAttributes, {
            class: 'ordered-list',
            'data-style': 'custom'
        }), 0]
    },
})

// Inline TiptapEditor component
interface TiptapEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    editorRef?: (editor: CoreEditor | null) => void;
    proseMirrorRef?: React.RefObject<HTMLDivElement | null>;
    listStyle?: string;
}

function TiptapEditor({
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

// Inline ConsiderationPaper component
interface ConsiderationPaperProps {
    children: React.ReactNode
    onClick?: () => void
}

function ConsiderationPaper({ children, onClick }: ConsiderationPaperProps) {
    return (
        <div
            className="bg-[#F0F2F5] p-4 md:p-8 flex-1 flex justify-center items-start overflow-y-auto cursor-text min-h-[calc(100vh-200px)]"
            onClick={onClick}
        >
            {/* --- THE PAPER --- */}
            <div
                className={cn(
                    "bg-white w-full max-w-212.5 min-h-264",
                    "shadow-sm border border-[#e1e3e6]",
                    "relative transition-all duration-300",
                    "px-12 py-16 md:px-24 md:py-24"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-0.5">
                    {children}
                </div>
            </div>
        </div>
    )
}

// Inline ConsiderationEditor component (dynamic wrapper)
interface ConsiderationEditorProps {
    value: string;
    onChange: (val: string) => void;
    proseMirrorRef: React.RefObject<HTMLDivElement | null>;
    listStyle: string;
}

function ConsiderationEditor({ value, onChange, proseMirrorRef, listStyle }: ConsiderationEditorProps) {
    return (
        <TiptapEditor
            value={value}
            onChange={onChange}
            proseMirrorRef={proseMirrorRef}
            listStyle={listStyle}
        />
    );
}

export function ConsiderationsSection({ value, setValue, activeAgendaTitle }: ConsiderationsSectionProps) {
    const proseMirrorRef = React.useRef<HTMLDivElement | null>(null);
    const [listStyle, setListStyle] = React.useState("list-decimal");
    const [isOrderedListActive, setIsOrderedListActive] = React.useState(false);

    // Handler untuk toggle ordered list
    const handleToggleOrderedList = () => {
        const editor = (proseMirrorRef.current as any)?.editor;
        if (editor) {
            editor.chain().focus().toggleOrderedList().run();
        }
    };

    // Handler untuk toggle bullet list
    const handleToggleBulletList = () => {
        const editor = (proseMirrorRef.current as any)?.editor;
        if (editor) {
            editor.chain().focus().toggleBulletList().run();
        }
    };

    // Handler untuk mengubah list style
    const handleSetListStyle = (style: string) => {
        const fullStyle = style.startsWith('list-') ? style : `list-${style}`;
        setListStyle(fullStyle);
    };

    // Handler indent/outdent
    const handleIndent = () => {
        const editor = (proseMirrorRef.current as any)?.editor;
        if (editor) {
            editor.chain().focus().sinkListItem('listItem').run();
        }
    };

    const handleOutdent = () => {
        const editor = (proseMirrorRef.current as any)?.editor;
        if (editor) {
            editor.chain().focus().liftListItem('listItem').run();
        }
    };

    // Update state dari editor
    useEffect(() => {
        const checkEditorState = () => {
            const editor = (proseMirrorRef.current as any)?.editor;
            if (editor) {
                setIsOrderedListActive(editor.isActive('orderedList'));
            }
        };

        const interval = setInterval(checkEditorState, 300);
        return () => clearInterval(interval);
    }, []);

    // Load CSS
    useEffect(() => {
        import("./tiptap-list-styles.css");
    }, []);

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-200">
            <ConsiderationToolbar
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
                onChangeStyle={() => { }}
            />
            <ConsiderationPaper>
                <ConsiderationEditor
                    value={value}
                    onChange={setValue}
                    proseMirrorRef={proseMirrorRef}
                    listStyle={listStyle}
                />
            </ConsiderationPaper>
        </Card>
    );
}