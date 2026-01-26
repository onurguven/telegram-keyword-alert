/**
 * Telegram Keyword Alert - Telegram DOM Helpers
 * DOM query utilities and helper functions
 */

import { ATTR, getCachedSelectors, type AttrValue } from './selectors';

// ============== DOM QUERY FUNCTIONS ==============

/**
 * Query single element using multiple selector fallbacks
 */
export function querySelector(
  root: Document | Element,
  selectors: string[]
): Element | null {
  for (const selector of selectors) {
    try {
      const el = root.querySelector(selector);
      if (el) return el;
    } catch {
      // Invalid selector, try next
    }
  }
  return null;
}

/**
 * Query all elements using multiple selector fallbacks
 */
export function querySelectorAll(
  root: Document | Element,
  selectors: string[]
): Element[] {
  const results: Element[] = [];
  const seen = new Set<Element>();
  for (const selector of selectors) {
    try {
      root.querySelectorAll(selector).forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          results.push(el);
        }
      });
    } catch {
      // Invalid selector, try next
    }
  }
  return results;
}

// ============== ATTRIBUTE HELPERS ==============

/**
 * Get attribute value using ATTR constant
 */
export function getAttr(el: Element, attr: AttrValue): string | null {
  return el.getAttribute(attr);
}

// ============== MESSAGE HELPERS ==============

/**
 * Check if element is an outgoing message
 */
export function isOutgoingMessage(el: Element): boolean {
  const S = getCachedSelectors();
  return S.outgoingClasses.some(
    (cls) => el.classList.contains(cls) || el.closest(`.${cls}`) !== null
  );
}

// ============== PROFILE HELPERS ==============

/**
 * Check if element matches any profile panel selector
 */
export function isProfilePanel(el: Element): boolean {
  const S = getCachedSelectors();
  return S.profilePanel.some((selector) => {
    try {
      return el.matches(selector);
    } catch {
      return false;
    }
  });
}

// ============== CHAT INFO FUNCTIONS ==============

/**
 * Get current chat name from DOM
 */
export function getCurrentChatName(): string | null {
  const S = getCachedSelectors();
  const el = querySelector(document, S.chatTitle);
  return el ? el.textContent?.trim() || null : null;
}

/**
 * Get current chat peer ID from DOM or URL hash
 */
export function getCurrentChatPeerId(): string | null {
  const S = getCachedSelectors();

  for (const selector of S.chatPeerId) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const peerId = getAttr(el, ATTR.PEER_ID);
        if (peerId) return peerId;
      }
    } catch {
      // Invalid selector, try next
    }
  }

  // Fallback: extract from URL hash
  const hash = window.location.hash;
  if (hash) {
    const match = hash.match(/#(-?\d+)/);
    if (match) return match[1];
  }

  return null;
}
