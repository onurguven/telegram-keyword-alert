/**
 * Application Constants
 * Centralized constants for the entire extension
 */

// ============== TIMING ==============

export const TIMING = {
  /** Tab ping timeout (ms) */
  TAB_PING_TIMEOUT: 2000,

  /** Cache refresh interval (ms) */
  CACHE_REFRESH_INTERVAL: 30000,

  /** Observer health check interval (ms) */
  OBSERVER_CHECK_INTERVAL: 2000,

  /** Polling interval as fallback (ms) */
  POLLING_INTERVAL: 5000,

  /** Content script init delay (ms) */
  INIT_DELAY: 2000,

  /** Injection delay for profile panel (ms) */
  INJECTION_DELAY: 300,

  /** Profile panel check delay (ms) */
  PROFILE_PANEL_CHECK_DELAY: 1000,

  /** Toast display duration (ms) */
  TOAST_DISPLAY_DURATION: 5000,

  /** Toast fade duration (ms) */
  TOAST_FADE_DURATION: 300,

  /** Gap between stacked toasts (px) */
  TOAST_STACK_GAP: 12,

  /** Sound gap between queued sounds (ms) */
  SOUND_GAP_MS: 400,

  /** Highlight animation duration (ms) */
  HIGHLIGHT_ANIMATION_DURATION: 1000,
} as const;

// ============== STORAGE ==============

export const STORAGE = {
  /** Maximum history items to keep */
  MAX_HISTORY_ITEMS: 20,

  /** Message ID TTL for deduplication (24 hours) */
  MESSAGE_ID_TTL_MS: 24 * 60 * 60 * 1000,

  /** Maximum notified IDs to keep */
  MAX_NOTIFIED_IDS: 500,

  /** Export data version */
  EXPORT_VERSION: 1,
} as const;

// ============== UI ==============

export const UI = {
  /** Maximum badge count before showing "99+" */
  BADGE_MAX_COUNT: 99,

  /** Maximum visible toasts at once */
  MAX_VISIBLE_TOASTS: 4,

  /** Maximum sounds in queue */
  MAX_SOUND_QUEUE: 4,

  /** Maximum sender name length */
  MAX_SENDER_NAME_LENGTH: 50,

  /** Message preview length in toast */
  MESSAGE_PREVIEW_LENGTH: 100,

  /** Panel animation duration (ms) */
  PANEL_ANIMATION_DURATION: 250,

  /** Active tabs refresh interval (ms) */
  ACTIVE_TABS_REFRESH_INTERVAL: 5000,

  /** Generic UI delay for focus, transitions etc. (ms) */
  DELAY: 300,

  /** Popup toast duration (ms) */
  POPUP_TOAST_DURATION: 2000,

  /** Toast base offset from screen edge (px) */
  TOAST_BASE_OFFSET: 20,

  /** Success color for toasts */
  SUCCESS_COLOR: '#31a24c',

  /** Default toast accent color */
  TOAST_ACCENT_COLOR: '#3390ec',

  /** Fallback sender name for toasts */
  TOAST_FALLBACK_SENDER: 'Telegram',

  /** Color presets for rule color picker */
  COLOR_PRESETS: [
    '#3390ec', '#e53935', '#43a047', '#fb8c00',
    '#8e24aa', '#00acc1', '#f06292', '#78909c',
  ] as readonly string[],
} as const;

// ============== MEMORY ==============

export const MEMORY = {
  /** Maximum processed messages to track */
  MAX_PROCESSED_MESSAGES: 500,

  /** Max polling set size */
  MAX_POLLING_SET_SIZE: 50,
} as const;

// ============== DOM ==============

export const DOM = {
  /** Data attribute for processed messages */
  PROCESSED_ATTR: 'data-tka-processed',

  /** Data attribute for injected user ID */
  PROFILE_INJECTED_ATTR: 'data-tka-userid-injected',

  /** Unicode cleanup regex */
  UNICODE_CLEANUP_REGEX: /[\u200B-\u200D\uFEFF\u2060]/g,
} as const;

// ============== DEFAULTS ==============

export const DEFAULTS = {
  /** Default rule highlight color */
  RULE_COLOR: '#3390ec',

  /** Default rule match mode */
  MATCH_MODE: 'any' as const,

  /** Default theme */
  THEME: 'system' as const,

  /** Default notification sound */
  SOUND: 'notification' as const,

  /** Default toast position */
  TOAST_POSITION: 'top-right' as const,
} as const;

// ============== PATHS ==============

export const PATHS = {
  /** Extension icon path */
  ICON_128: '/icons/128.png',
} as const;
