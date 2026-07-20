import DOMPurify from 'dompurify'

// Whitelist of tags/attributes considered safe for user-authored rich text
// (game descriptions). Scripts, event handlers and javascript: URLs are
// always stripped by DOMPurify; this list just narrows the surface further.
const ALLOWED_TAGS = [
  // inline styling
  'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins', 'mark',
  'span', 'small', 'sub', 'sup', 'code', 'br', 'a', 'font',
  // simple block content
  'p', 'div', 'ul', 'ol', 'li', 'blockquote', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img'
]

const ALLOWED_ATTR = [
  'style', 'href', 'title',
  // legacy <font> attributes, common in scraped descriptions
  'color', 'size', 'face',
  // <img> essentials
  'src', 'alt', 'width', 'height',
  // <ol> numbering
  'start', 'type'
]

/**
 * Sanitize a fragment of user-provided HTML so it can be rendered
 * with v-html. Keeps simple formatting tags, drops everything that
 * could execute code or navigate the webview.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // href/src must be a plain web/mail link; blocks tauri://, file:// etc.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|data:image\/)/i,
    // Plain-value attributes DOMPurify would otherwise run through the
    // URI regexp above (it URI-checks everything not marked URI-safe)
    ADD_URI_SAFE_ATTR: ['color', 'size', 'face', 'width', 'height', 'start', 'type']
  })
}
