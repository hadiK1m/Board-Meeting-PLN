"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { ConsiderationPaper } from "./consideration-paper"
import { ConsiderationToolbar } from "./consideration-toolbar"

interface ConsiderationsSectionProps {
    value: string
    setValue: (val: string) => void
    activeAgendaTitle?: string
}

const ConsiderationEditor = dynamic(() => import("./ConsiderationEditor"), {
    ssr: false,
    loading: () => (
        <div className="ProseMirror focus:outline-none min-h-[300px] bg-white rounded-md p-4 border border-slate-200 shadow-sm">
            Loading editor...
        </div>
    )
})

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