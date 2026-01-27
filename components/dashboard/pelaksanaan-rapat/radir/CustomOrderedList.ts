import { mergeAttributes, Extension } from '@tiptap/core'
import { OrderedList as TiptapOrderedList } from '@tiptap/extension-ordered-list'

export const CustomOrderedList = TiptapOrderedList.extend({
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