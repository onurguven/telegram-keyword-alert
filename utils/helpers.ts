/**
 * Helper Utilities
 * Common helper functions for string manipulation and security
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape attribute values for safe HTML attribute insertion
 */
export function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlight keywords in text with HTML spans
 * @param text - The text to highlight
 * @param keywords - Array of keywords to highlight
 * @param className - CSS class name for highlight spans (default: 'keyword-highlight')
 */
export function highlightKeywords(
  text: string,
  keywords: string[],
  className = 'keyword-highlight'
): string {
  if (!keywords || keywords.length === 0) {
    return escapeHtml(text);
  }

  let result = escapeHtml(text);

  for (const keyword of keywords) {
    if (!keyword) continue;
    const escapedKeyword = escapeRegExp(escapeHtml(keyword));
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    result = result.replace(regex, `<span class="${className}">$1</span>`);
  }

  return result;
}
