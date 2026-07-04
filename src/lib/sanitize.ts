/**
 * Client-side HTML sanitizer using the browser's native DOMParser.
 * Removes dangerous elements and attributes before rendering user-supplied HTML.
 * Only call this on the client (inside useEffect or event handlers).
 */

const FORBIDDEN_TAGS = new Set([
  "script", "iframe", "object", "embed", "form", "input", "button",
  "textarea", "select", "meta", "link", "base", "frame", "frameset",
  "applet", "svg", "math",
]);

const FORBIDDEN_ATTR_PREFIXES = ["on"]; // onclick, onerror, onload, etc.

const FORBIDDEN_ATTR_NAMES = new Set([
  "href", "src", "action", "formaction", "data", "xlink:href",
]);

const SAFE_URL_PREFIXES = ["https://", "http://", "mailto:", "/", "#", ""];

function isSafeUrl(value: string): boolean {
  const lower = value.trim().toLowerCase();
  // Reject javascript:, data:, vbscript:, etc.
  if (/^(javascript|data|vbscript|blob):/i.test(lower)) return false;
  return SAFE_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    // SSR: strip all tags as a safe fallback
    return html.replace(/<[^>]*>/g, "");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Walk the entire tree and sanitize each element
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node instanceof Element) {
      const tag = node.tagName.toLowerCase();

      if (FORBIDDEN_TAGS.has(tag)) {
        toRemove.push(node);
      } else {
        // Sanitize attributes
        const attrs = Array.from(node.attributes);
        for (const attr of attrs) {
          const name = attr.name.toLowerCase();
          const isForbiddenPrefix = FORBIDDEN_ATTR_PREFIXES.some((p) =>
            name.startsWith(p)
          );
          if (isForbiddenPrefix) {
            node.removeAttribute(attr.name);
            continue;
          }
          if (FORBIDDEN_ATTR_NAMES.has(name)) {
            if (!isSafeUrl(attr.value)) {
              node.removeAttribute(attr.name);
            }
          }
        }
      }
    }
    node = walker.nextNode();
  }

  // Remove forbidden nodes (replace with their text content to preserve visible text)
  for (const el of toRemove) {
    const text = doc.createTextNode(el.textContent || "");
    el.parentNode?.replaceChild(text, el);
  }

  return doc.body.innerHTML;
}
