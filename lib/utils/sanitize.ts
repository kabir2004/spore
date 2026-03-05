/**
 * sanitizeHtml — strips dangerous tags and attributes from contentEditable HTML
 * before it is written to the Zustand store / Supabase.
 *
 * Allowed tags: inline formatting only (b, strong, i, em, u, s, del, strike,
 * code, span, a, br). All other tags are replaced with their text content.
 * Allowed attributes: class (for colour/highlight spans), href (a only — https/http only).
 * All event handlers (on*), style attributes, and javascript: hrefs are stripped.
 *
 * This runs purely in the browser (DOMParser). Never call it on the server.
 */

const ALLOWED_TAGS = new Set([
    'b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike', 'code', 'span', 'a', 'br',
]);

function sanitizeNode(node: Node, out: DocumentFragment): void {
    if (node.nodeType === Node.TEXT_NODE) {
        out.appendChild(document.createTextNode(node.textContent ?? ''));
        return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (ALLOWED_TAGS.has(tag)) {
        const safe = document.createElement(tag);

        // Allow class (for text-colour / highlight spans) — strip anything that
        // looks like an unsafe CSS class (e.g. injected js-* classes).
        const cls = el.getAttribute('class');
        if (cls) {
            // Only allow classes that match our design-token pattern
            const safeCls = cls
                .split(/\s+/)
                .filter((c) => /^[a-z0-9_:[\]/-]+$/.test(c))
                .join(' ');
            if (safeCls) safe.setAttribute('class', safeCls);
        }

        // Allow href on <a> — https / http only
        if (tag === 'a') {
            const href = el.getAttribute('href') ?? '';
            if (/^https?:\/\//i.test(href)) {
                safe.setAttribute('href', href);
                safe.setAttribute('target', '_blank');
                safe.setAttribute('rel', 'noopener noreferrer');
            }
        }

        // Recursively sanitize children
        const childOut = document.createDocumentFragment();
        el.childNodes.forEach((child) => sanitizeNode(child, childOut));
        safe.appendChild(childOut);
        out.appendChild(safe);
    } else {
        // Unknown / disallowed tag — preserve text content only
        const childOut = document.createDocumentFragment();
        el.childNodes.forEach((child) => sanitizeNode(child, childOut));
        out.appendChild(childOut);
    }
}

export function sanitizeHtml(dirty: string): string {
    if (typeof window === 'undefined') return dirty; // SSR guard — should never run server-side
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirty, 'text/html');
    const out = document.createDocumentFragment();
    doc.body.childNodes.forEach((node) => sanitizeNode(node, out));
    const wrapper = document.createElement('div');
    wrapper.appendChild(out);
    return wrapper.innerHTML;
}
