export type BlockType =
    | 'page'
    | 'text'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'bulleted_list_item'
    | 'numbered_list_item'
    | 'to_do'
    | 'toggle'
    | 'quote'
    | 'callout'
    | 'code'
    | 'image'
    | 'video'
    | 'audio'
    | 'file'
    | 'bookmark'
    | 'embed'
    | 'equation'
    | 'divider';

/** User-defined property (field) on a page — displayed as a widget below the title */
export type PageFieldType =
    | 'text'
    | 'number'
    | 'date'
    | 'person'
    | 'select'
    | 'multi_select'
    | 'url'
    | 'checkbox';

export interface PageField {
    id: string;
    name: string;
    type: PageFieldType;
    /** For select / multi_select: option labels */
    options?: string[];
    /** Current value; shape depends on type */
    value?: string | number | boolean | string[] | null;
}

export interface BlockProperties {
    [key: string]: unknown;
    // Page
    title?: string;
    icon?: string;
    coverImage?: string;
    /** Custom fields (widgets) on the page */
    pageFields?: PageField[];

    // Content (text, headings, lists, toggle, quote, callout)
    text?: string;
    checked?: boolean;    // to_do
    open?: boolean;       // toggle (persisted open/closed state)

    // Callout
    calloutIcon?: string;  // emoji character, e.g. '💡'
    calloutColor?: string; // 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

    // Code
    language?: string;
    code?: string;

    // Equation
    expression?: string;

    // Media (image, video, audio, file)
    url?: string;
    caption?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;

    // Bookmark
    bookmarkTitle?: string;
    bookmarkDescription?: string;
    bookmarkFavicon?: string;
}

export interface IBlock {
    id: string;
    type: BlockType;
    properties: BlockProperties;
    content: string[]; // Array of child Block IDs
    parent_id: string | null;
    created_time: number;
    last_edited_time: number;
}
