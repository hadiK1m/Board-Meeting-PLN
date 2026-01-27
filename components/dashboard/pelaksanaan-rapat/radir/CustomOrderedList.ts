/* eslint-disable @typescript-eslint/no-explicit-any */
// Gunakan default import jika paket Anda mengekspor mergeAttributes sebagai default
import mergeAttributes from '@tiptap/core'
import { OrderedList as TiptapOrderedList } from '@tiptap/extension-ordered-list'

export const CustomOrderedList = TiptapOrderedList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            class: {
                default: 'ordered-list',
                parseHTML: (element: Element | null) => element?.getAttribute('class') ?? undefined,
                renderHTML: (attributes: Record<string, unknown>) => ({
                    class: (attributes as Record<string, any>).class,
                }),
            },
        }
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
        return ['ol', mergeAttributes(HTMLAttributes, {
            class: 'ordered-list',
            'data-style': 'custom'
        }), 0]
    },
})