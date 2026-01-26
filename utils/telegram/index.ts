/**
 * Telegram Keyword Alert - Telegram Utilities
 * Re-exports for convenient importing
 */

// Version detection
export {
  VERSION,
  VERSION_FINGERPRINTS,
  type TelegramVersion,
  detectVersion,
  isWebA,
  isWebK,
} from './version';

// DOM selectors
export {
  ATTR,
  type AttrKey,
  type AttrValue,
  type SelectorProfile,
  getCachedSelectors,
  invalidateSelectorCache,
} from './selectors';

// DOM helpers
export {
  querySelector,
  querySelectorAll,
  getAttr,
  isOutgoingMessage,
  isProfilePanel,
  getCurrentChatName,
  getCurrentChatPeerId,
} from './dom';
