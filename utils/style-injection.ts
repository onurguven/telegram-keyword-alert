/**
 * Style Injection Utility
 * Safely inject CSS styles into the document
 * Prevents duplicate injections
 */

const injectedStyles = new Set<string>();

/**
 * Inject CSS styles into the document head
 * @param id - Unique identifier for the style element
 * @param css - CSS content to inject
 */
export function injectStyles(id: string, css: string): void {
  if (injectedStyles.has(id) || document.getElementById(id)) {
    injectedStyles.add(id);
    return;
  }

  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
  injectedStyles.add(id);
}
