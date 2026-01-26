"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { ConsiderationPaper } from "./consideration-paper"

interface ConsiderationsSectionProps {
    value: string
    setValue: (val: string) => void
    activeAgendaTitle?: string
}

// Dynamic import agar SSR aman
const TiptapEditor = dynamic(() => import("./TiptapEditor"), { ssr: false })

// Toolbar Komponen
import { Editor } from "@tiptap/react";

interface ConsiderationToolbarProps {
    editor: Editor | null;
    // Allow null because useRef initial value is null
    proseMirrorRef: React.RefObject<HTMLDivElement | null>;
}

function ConsiderationToolbar({ editor, proseMirrorRef }: ConsiderationToolbarProps) {
    // Semua preset yang ada di CSS
    const stylePresets = [
        { key: 'multidecimal', label: '1.1.1', title: 'Multilevel Decimal (1.1.1)' },
        { key: 'parenthesis', label: '1) a) i)', title: 'Parenthesis (1) a) i))' },
        { key: 'mixed-simple', label: '1. a. i.', title: 'Standard Mixed (1. a. i.)' },
        { key: 'lower-alpha', label: 'a.b.c', title: 'Lower Alpha (a.b.c)' },
        { key: 'lower-roman', label: 'i.ii.iii', title: 'Lower Roman (i.ii.iii)' },
        { key: 'upper-roman', label: 'I.II.III', title: 'Upper Roman (I.II.III)' },
        { key: 'upper-alpha', label: 'A.B.C', title: 'Upper Alpha (A.B.C)' },
        { key: 'outline', label: 'I.A.1.a', title: 'Outline (I. A. 1. a.)' },
        { key: 'decimal-alpha', label: '1.a', title: 'Decimal-Alpha (1.a)' },
        { key: 'decimal-alpha-decimal', label: '1.a.1', title: 'Decimal-Alpha-Decimal (1.a.1)' },
        { key: 'bullet', label: '• ◦ ▪', title: 'Bullet Multilevel (• ◦ ▪)' },
    ];
    const [listStyle, setListStyle] = React.useState('multidecimal');

    React.useEffect(() => {
        if (!editor || !proseMirrorRef.current) return;
        const root = proseMirrorRef.current;
        // Remove all preset classes
        stylePresets.forEach(preset => root.classList.remove(`list-${preset.key}`));
        // Add active preset
        if (listStyle) root.classList.add(`list-${listStyle}`);
    }, [listStyle, proseMirrorRef, editor]);

    if (!editor) return null;

    const handleToggleHeading = (level: number) => {
        if (!editor) return;
        editor.chain().focus().toggleHeading({ level }).run();
    };

    const handleToggleOrderedList = () => {
        if (!editor) return;
        editor.chain().focus().toggleOrderedList().run();
    };

    const handleToggleBulletList = () => {
        if (!editor) return;
        editor.chain().focus().toggleBulletList().run();
    };

    const handleSinkListItem = () => {
        if (!editor) return;
        editor.chain().focus().sinkListItem('listItem').run();
    };

    const handleLiftListItem = () => {
        if (!editor) return;
        editor.chain().focus().liftListItem('listItem').run();
    };

    return (
        <div className="flex flex-wrap gap-2 items-center border-b bg-white/80 px-4 py-2 sticky top-0 z-10">
            {/* Text Formatting */}
            <div className="flex gap-1 border-r pr-2">
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => editor.commands.toggleMark('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <b>B</b>
                </button>
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => handleToggleHeading(1)}
                    title="Heading 1"
                >
                    H1
                </button>
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => handleToggleHeading(2)}
                    title="Heading 2"
                >
                    H2
                </button>
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => handleToggleHeading(3)}
                    title="Heading 3"
                >
                    H3
                </button>
            </div>

            {/* List Controls */}
            <div className="flex gap-1 border-r pr-2">
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={handleToggleOrderedList}
                    title="Multilevel List"
                >
                    <span className="font-bold">1.</span>
                </button>
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={handleToggleBulletList}
                    title="Bullet List"
                >
                    •
                </button>
            </div>

            {/* List Operations */}
            <div className="flex gap-1 border-r pr-2">
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${!editor.isActive('listItem') ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={handleSinkListItem}
                    title="Indent (Tab)"
                    disabled={!editor.isActive('listItem')}
                >
                    →
                </button>
                <button
                    type="button"
                    className={`px-3 py-1.5 rounded ${!editor.isActive('listItem') ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={handleLiftListItem}
                    title="Outdent (Shift+Tab)"
                    disabled={!editor.isActive('listItem')}
                >
                    ←
                </button>
            </div>

            {/* List Style Selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">List Style:</span>
                <div className="flex gap-1 flex-wrap">
                    {stylePresets.map(preset => (
                        <button
                            key={preset.key}
                            type="button"
                            className={`px-2 py-1 text-xs rounded ${listStyle === preset.key ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white border hover:bg-gray-50'}`}
                            onClick={() => setListStyle(preset.key)}
                            title={preset.title}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Shortcut Info */}
            <div className="text-xs text-slate-400 italic ml-auto hidden md:block">
                Tab=Indent • Shift+Tab=Outdent
            </div>
        </div>
    );
}

// Custom CSS agar list bertingkat tampil seperti 1.1, 1.1.1, dsb
// Hapus error dengan menambahkan tipe module
// import "./tiptap-list-styles.css"

export function ConsiderationsSection({ value, setValue }: ConsiderationsSectionProps) {
    // Gunakan ref state untuk akses editor instance dari TiptapEditor
    const [editor, setEditor] = React.useState<Editor | null>(null);
    // Izinkan null pada ref karena initial value null
    const proseMirrorRef = React.useRef<HTMLDivElement | null>(null);

    // Load CSS secara dinamis
    React.useEffect(() => {
        // Import CSS hanya di client side
        import("./tiptap-list-styles.css");
    }, []);

    return (
        <Card className="border-none shadow-none bg-transparent flex flex-col h-full">
            <ConsiderationToolbar editor={editor} proseMirrorRef={proseMirrorRef} />
            <ConsiderationPaper>
                <TiptapEditor
                    value={value}
                    onChange={setValue}
                    editorRef={setEditor}
                    proseMirrorRef={proseMirrorRef}
                />
            </ConsiderationPaper>
        </Card>
    )
}
