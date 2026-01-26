/**
 * Browser API types for cross-browser compatibility
 * Handles differences between Manifest V2 (browserAction) and V3 (action)
 */

export interface BrowserActionAPI {
  setBadgeText(details: { text: string; tabId?: number }): Promise<void>;
  setBadgeBackgroundColor(details: {
    color: string | [number, number, number, number];
  }): Promise<void>;
  setTitle?(details: { title: string; tabId?: number }): Promise<void>;
  setIcon?(details: {
    path?: string | { [size: string]: string };
    tabId?: number;
  }): Promise<void>;
}

/**
 * Get the browser action API (handles MV2 browserAction vs MV3 action)
 * @returns BrowserActionAPI or undefined if not available
 */
export function getBrowserAction(): BrowserActionAPI | undefined {
  // Manifest V3: action
  if ('action' in browser && browser.action) {
    return browser.action as unknown as BrowserActionAPI;
  }

  // Manifest V2: browserAction
  if ('browserAction' in browser && browser.browserAction) {
    return browser.browserAction as unknown as BrowserActionAPI;
  }

  return undefined;
}
