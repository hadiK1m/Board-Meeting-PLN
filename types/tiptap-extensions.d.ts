/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@tiptap/core" {
    // Minimal Command type (runtime uses functions returning boolean)
    export type Command = (...args: any[]) => boolean;

    // Chainable command return (very small subset we need)
    export interface ChainableCommands {
        focus: () => ChainableCommands;
        run: () => boolean;

        // Common editors commands we call via chain()
        setHardBreak?: () => ChainableCommands;
        setTextAlign?: (align: string) => ChainableCommands;
        splitListItem?: () => ChainableCommands;
        splitBlock?: () => ChainableCommands;
        sinkListItem?: (type: string) => ChainableCommands;
        liftListItem?: (type: string) => ChainableCommands;

        // generic toggle/update helpers
        toggleOrderedList?: (attrs?: Record<string, any>) => ChainableCommands;
        updateAttributes?: (name: string, attrs: Record<string, any>) => boolean;
        toggleBulletList?: () => ChainableCommands;
        toggleOrderedList?: () => ChainableCommands;
        toggleHeading?: (attrs?: Record<string, any>) => ChainableCommands;
        undo?: () => ChainableCommands;
        redo?: () => ChainableCommands;
        setHorizontalRule?: () => ChainableCommands;
    }

    export interface Commands {
        // generic map of commands — concrete commands are provided by extensions
        [key: string]: any;
    }

    export interface Editor {
        chain: () => ChainableCommands;
        commands: Commands;
        isActive: (name: string, attrs?: Record<string, any>) => boolean;
        view?: {
            dom: HTMLElement;
        };
        getText?: () => string;
    }

    // Minimal Extension type to satisfy imports (we don't type its internals here)
    export const Extension: any;
    export function Extension(...args: any[]): any;
    export default Extension;
}