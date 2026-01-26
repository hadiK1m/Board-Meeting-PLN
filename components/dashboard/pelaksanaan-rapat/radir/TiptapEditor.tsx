import React, { useEffect } from "react";
import { EditorContent, useEditor, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Underline from "@tiptap/extension-underline";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import TextAlign from "@tiptap/extension-text-align";

export interface TiptapEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    editorRef?: (editor: Editor | null) => void;
    // ✅ WAJIB nullable, karena useRef selalu mulai dari null
    proseMirrorRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TiptapEditor({
    value,
    onChange,
    editorRef,
    proseMirrorRef,
}: TiptapEditorProps) {

    const editor = useEditor({
        extensions: [
            StarterKit,
            Bold,
            Underline,
            Heading.configure({ levels: [1, 2, 3] }),
            BulletList,
            OrderedList.configure({
                HTMLAttributes: {
                    class: "ordered-list",
                },
            }),
            ListItem.configure({
                HTMLAttributes: {
                    class: "list-item",
                },
            }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
        ],
        content: value || "",
        onUpdate({ editor }) {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class:
                    "focus:outline-none min-h-[300px] bg-white rounded-md p-4 border border-slate-200 shadow-sm",
            },
            handleKeyDown: (_view, event: KeyboardEvent) => {
                if (!editor) return false;

                // Tab = indent
                if (event.key === "Tab" && !event.shiftKey) {
                    event.preventDefault();
                    editor.chain().focus().sinkListItem("listItem").run();
                    return true;
                }

                // Shift + Tab = outdent
                if (event.key === "Tab" && event.shiftKey) {
                    event.preventDefault();
                    editor.chain().focus().liftListItem("listItem").run();
                    return true;
                }

                // Enter = new list item
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    editor.chain().focus().splitListItem("listItem").run();
                    return true;
                }

                return false;
            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && editorRef) {
            editorRef(editor);
        }
    }, [editor, editorRef]);

    return <EditorContent editor={editor} ref={proseMirrorRef} />;
}
