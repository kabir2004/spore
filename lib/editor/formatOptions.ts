/**
 * Inline formatting options for the block editor.
 * Classes are applied as <span class="..."> so we can theme via CSS and support dark mode.
 */

export const FONT_OPTIONS = [
    { id: 'default', label: 'Default', className: '' },
    { id: 'mono', label: 'Monospace', className: 'inline-font-mono' },
] as const;

export const TEXT_COLOR_OPTIONS = [
    { id: 'default', label: 'Default', className: '' },
    { id: 'muted', label: 'Muted', className: 'inline-color-muted' },
    { id: 'blue', label: 'Blue', className: 'inline-color-blue' },
    { id: 'green', label: 'Green', className: 'inline-color-green' },
    { id: 'red', label: 'Red', className: 'inline-color-red' },
    { id: 'orange', label: 'Orange', className: 'inline-color-orange' },
    { id: 'purple', label: 'Purple', className: 'inline-color-purple' },
] as const;

export const HIGHLIGHT_COLOR_OPTIONS = [
    { id: 'none', label: 'None', className: '' },
    { id: 'yellow', label: 'Yellow', className: 'inline-highlight-yellow' },
    { id: 'green', label: 'Green', className: 'inline-highlight-green' },
    { id: 'blue', label: 'Blue', className: 'inline-highlight-blue' },
    { id: 'pink', label: 'Pink', className: 'inline-highlight-pink' },
] as const;
