/**
 * Telegram Keyword Alert - Telegram DOM Selectors
 * DOM selectors organized by Telegram Web version (A and K)
 */

import { detectVersion, VERSION } from './version';

// ============== ATTRIBUTE CONSTANTS ==============

export const ATTR = {
  PEER_ID: 'data-peer-id',
  MESSAGE_ID: 'data-message-id', // Web A
  MESSAGE_MID: 'data-mid', // Web K
} as const;

export type AttrKey = keyof typeof ATTR;
export type AttrValue = (typeof ATTR)[AttrKey];

// ============== COMMON SELECTORS ==============

const SELECTORS_COMMON = {
  // Metadata elements to clean (both versions)
  metadataElements: ['.time', '.time-inner', '.message-time', '.reactions', '.reply', '.clearfix'],
} as const;

// ============== TYPES ==============

export interface SelectorProfile {
  // Message list container (scrollable area)
  messageContainer: string[];
  // Individual message elements (must have ID attr)
  message: string[];
  // Message text content
  messageText: string[];
  // Sender name element (may include badges)
  senderName: string[];
  // Inner sender name (clean text, no badges)
  senderNameInner: string[];
  // Chat title in header
  chatTitle: string[];
  // Elements with chat peer ID
  chatPeerId: string[];
  // Profile panel (right sidebar)
  profilePanel: string[];
  // Profile info section
  profileInfoSection: string[];
  // Peer ID attribute selector: '[data-peer-id]'
  peerIdAttr: string;
  // Message ID attribute selector
  messageIdAttr: string;
  // Elements to remove for clean text (time, reactions, etc)
  elementsToClean: string[];
  // Outgoing message classes (without dot): ['own', 'outgoing']
  outgoingClasses: string[];
}

// ============== WEB A SELECTORS (React-based, /a/ path) ==============

export const SELECTORS_WEB_A: SelectorProfile = {
  messageContainer: ['.MessageList', '[class*="MessageList"]'],
  message: ['.Message[data-message-id]', '[data-message-id]'],
  messageText: ['.text-content', '[class*="text-content"]'],
  senderName: ['.message-title-name .sender-title', 'span.sender-title'],
  senderNameInner: ['span[dir="auto"]'],
  chatTitle: ['.ChatInfo h3.fullName', '.MiddleHeader h3.fullName'],
  chatPeerId: ['[data-peer-id]'],
  profilePanel: ['#RightColumn', '.Profile'],
  profileInfoSection: ['.profile-info', '[class*="ProfileInfo"]'],
  peerIdAttr: '[data-peer-id]',
  messageIdAttr: '[data-message-id]',
  elementsToClean: [...SELECTORS_COMMON.metadataElements, '[class*="MessageMeta"]', '[class*="reactions"]'],
  outgoingClasses: ['own'],
};

// ============== WEB K SELECTORS (Custom framework, /k/ path) ==============

export const SELECTORS_WEB_K: SelectorProfile = {
  messageContainer: ['.bubbles', '.bubbles-inner'],
  message: ['.bubble.can-have-tail', '[data-mid]'],
  messageText: ['.message .translatable-message'],
  senderName: ['.bubble .name .peer-title', '.bubble .name'],
  senderNameInner: ['.peer-title-inner'],
  chatTitle: ['.chat-info .peer-title', '.top .peer-title'],
  chatPeerId: ['.chat-info [data-peer-id]', '#column-center [data-peer-id]'],
  profilePanel: ['#column-right .profile-container', '#column-right'],
  profileInfoSection: ['.sidebar-left-section-content'],
  peerIdAttr: '[data-peer-id]',
  messageIdAttr: '[data-mid]',
  elementsToClean: [...SELECTORS_COMMON.metadataElements, 'reactions-element'],
  outgoingClasses: ['is-out'],
};

// ============== FALLBACK SELECTORS (Combined) ==============

/**
 * Merge selector arrays without duplicates
 */
function mergeSelectors(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

/**
 * Programmatically create fallback selectors by merging Web A and Web K
 */
function createFallbackSelectors(): SelectorProfile {
  const keys = Object.keys(SELECTORS_WEB_A) as (keyof SelectorProfile)[];
  const result = {} as SelectorProfile;

  for (const key of keys) {
    const a = SELECTORS_WEB_A[key];
    const k = SELECTORS_WEB_K[key];

    if (Array.isArray(a) && Array.isArray(k)) {
      (result as any)[key] = mergeSelectors(k, a);
    } else if (typeof a === 'string' && typeof k === 'string') {
      (result as any)[key] = a === k ? a : `${k}, ${a}`;
    } else {
      (result as any)[key] = a;
    }
  }

  return result;
}

export const SELECTORS_FALLBACK: SelectorProfile = createFallbackSelectors();

// ============== VERSION-AWARE SELECTOR ACCESS ==============

let cachedVersion: string | null = null;
let cachedSelectors: SelectorProfile | null = null;

/**
 * Get the appropriate selector profile based on detected version
 */
function getSelectors(): SelectorProfile {
  const version = detectVersion();

  switch (version) {
    case VERSION.WEB_A:
      return SELECTORS_WEB_A;
    case VERSION.WEB_K:
      return SELECTORS_WEB_K;
    default:
      return SELECTORS_FALLBACK;
  }
}

/**
 * Get cached selectors (invalidate on version change)
 */
export function getCachedSelectors(): SelectorProfile {
  const currentVersion = detectVersion();
  if (currentVersion !== cachedVersion) {
    cachedVersion = currentVersion;
    cachedSelectors = getSelectors();
  }
  return cachedSelectors!;
}

/**
 * Invalidate selector cache (call on hash change)
 */
export function invalidateSelectorCache(): void {
  cachedVersion = null;
  cachedSelectors = null;
}
