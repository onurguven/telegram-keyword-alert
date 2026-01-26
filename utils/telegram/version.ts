/**
 * Telegram Keyword Alert - Telegram Version Detector
 * Detects which Telegram Web version is running (A or K)
 */

import { logWarn } from '@/utils/error-handling';

export const VERSION = {
  WEB_A: 'web-a',
  WEB_K: 'web-k',
  UNKNOWN: 'unknown',
} as const;

export type TelegramVersion = (typeof VERSION)[keyof typeof VERSION];

// Version detection fingerprints
export const VERSION_FINGERPRINTS = {
  WEB_K: ['#column-center', '#column-right'] as const,
  WEB_A: ['[data-testid]', '[class*="Module_"]'] as const,
} as const;

let detectedVersion: TelegramVersion | null = null;

/**
 * Detect the Telegram Web version
 * Priority: URL path > DOM fingerprinting
 */
export function detectVersion(): TelegramVersion {
  if (detectedVersion) return detectedVersion;

  // Method 1: URL-based detection (most reliable)
  const path = window.location.pathname;
  if (path.startsWith('/a')) {
    detectedVersion = VERSION.WEB_A;
    return detectedVersion;
  }
  if (path.startsWith('/k')) {
    detectedVersion = VERSION.WEB_K;
    return detectedVersion;
  }

  // Method 2: DOM fingerprinting fallback
  // Web K has distinctive ID-based structure
  for (const selector of VERSION_FINGERPRINTS.WEB_K) {
    if (document.querySelector(selector)) {
      detectedVersion = VERSION.WEB_K;
      return detectedVersion;
    }
  }

  // Web A uses React with specific patterns
  for (const selector of VERSION_FINGERPRINTS.WEB_A) {
    if (document.querySelector(selector)) {
      detectedVersion = VERSION.WEB_A;
      return detectedVersion;
    }
  }

  // Fallback to unknown (will use merged selectors)
  detectedVersion = VERSION.UNKNOWN;
  logWarn('Version', 'Could not detect Telegram version, using fallback selectors');
  return detectedVersion;
}

/**
 * Check if running on Web A
 */
export function isWebA(): boolean {
  return detectVersion() === VERSION.WEB_A;
}

/**
 * Check if running on Web K
 */
export function isWebK(): boolean {
  return detectVersion() === VERSION.WEB_K;
}
