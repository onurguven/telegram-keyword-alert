/**
 * Telegram Keyword Alert - Content Script: Main
 * Observer, initialization, and message processing
 */

import './style.css';

import { browser } from 'wxt/browser';
import { TIMING, MEMORY, DOM } from '@/constants';
import { logWarn, logInfo, setDebugMode } from '@/utils/error-handling';
import { Storage } from '@/utils/tka-storage';
import { FifoSet } from '@/utils/fifo-set';
import {
  ATTR,
  getCachedSelectors,
  getAttr,
  invalidateSelectorCache,
  querySelector,
  querySelectorAll,
  getCurrentChatName,
  detectVersion,
} from '@/utils/telegram';
import { refreshCache, matchRules, cachedRules } from './matcher';
import { extractMessageData, processedMessages } from './extractor';
import { triggerNotification } from './notifier';
import { startProfilePanelObserver, stopProfilePanelObserver } from './user-id';
import { initSounds } from '@/utils/sounds';
import type {
  ExtensionMessage,
  PingResponse,
  ForceScanResponse,
  ClearCacheResponse,
} from '@/types/messages';

// ============== STATE ==============

let observer: MutationObserver | null = null;
let currentObservedContainer: Element | null = null;
let lastPolledMids = new FifoSet<string>(MEMORY.MAX_POLLING_SET_SIZE);
let isInitialized = false;

// Interval IDs for cleanup
let cacheRefreshInterval: ReturnType<typeof setInterval> | null = null;
let observerCheckInterval: ReturnType<typeof setInterval> | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;

// ============== MESSAGE PROCESSING ==============

async function processMessage(messageEl: Element): Promise<void> {
  const data = extractMessageData(messageEl);
  if (!data) return;

  const match = matchRules(data.text, data.chat, data.sender, data.senderId);
  if (match) {
    await triggerNotification(data, match);
  }
}

async function processNewMessages(): Promise<void> {
  const S = getCachedSelectors();
  const containers = querySelectorAll(document, S.messageContainer);

  if (containers.length === 0) {
    const allMessages = querySelectorAll(document, S.message);
    const recentMessages = allMessages.slice(-10);
    for (const messageEl of recentMessages) {
      await processMessage(messageEl);
    }
    return;
  }

  for (const container of containers) {
    const messages = querySelectorAll(container, S.message);
    const recentMessages = messages.slice(-10);
    for (const messageEl of recentMessages) {
      await processMessage(messageEl);
    }
  }
}

/**
 * Scan recent messages with optional polling tracking
 */
async function scanRecentMessages(limit: number = 5, trackPolled: boolean = false): Promise<void> {
  const S = getCachedSelectors();
  const messages = document.querySelectorAll(S.messageIdAttr);
  const recent = Array.from(messages).slice(-limit);

  for (const msg of recent) {
    const mid = getAttr(msg, ATTR.MESSAGE_MID);
    const chat = getCurrentChatName() || 'unknown';
    const key = `${chat}:${mid}`;

    if (trackPolled) {
      if (!lastPolledMids.has(key) && !processedMessages.has(key)) {
        lastPolledMids.add(key);
        await processMessage(msg);
      }
    } else if (!processedMessages.has(key)) {
      await processMessage(msg);
    }
  }
}

// ============== MUTATION OBSERVER ==============

/**
 * Extract new message elements from mutations
 */
function extractNewMessageElements(mutations: MutationRecord[]): Element[] {
  const S = getCachedSelectors();
  const elements: Element[] = [];

  for (const mutation of mutations) {
    if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) continue;

    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const element = node as Element;

      // Check if element itself is a message
      if (element.hasAttribute?.(ATTR.MESSAGE_MID) || element.hasAttribute?.(ATTR.MESSAGE_ID)) {
        elements.push(element);
      }

      // Check for child messages
      if (element.querySelectorAll) {
        const childMessages = element.querySelectorAll(S.messageIdAttr);
        childMessages.forEach((el) => elements.push(el));
      }
    }
  }

  return elements;
}

/**
 * Handle DOM mutations and process new messages
 */
function handleMutations(mutations: MutationRecord[]): void {
  const newMessageElements = extractNewMessageElements(mutations);
  if (newMessageElements.length === 0) return;

  queueMicrotask(async () => {
    for (const el of newMessageElements) {
      await processMessage(el);
    }
  });
}

function startObserver(): void {
  const S = getCachedSelectors();

  if (observer) {
    observer.disconnect();
  }

  const container = querySelector(document, S.messageContainer) || document.body;
  currentObservedContainer = container;

  observer = new MutationObserver(handleMutations);
  observer.observe(container, {
    childList: true,
    subtree: true,
  });
}

// ============== INITIALIZATION ==============

async function init(): Promise<void> {
  if (isInitialized) {
    logWarn('Content', 'init() called multiple times, ignoring');
    return;
  }

  // Initialize debug mode from settings
  const settings = await Storage.getSettings();
  setDebugMode(settings.debugMode);

  // Listen for settings changes to update debug mode
  Storage.watchSettings((newSettings) => {
    setDebugMode(newSettings.debugMode);
  });

  // Initialize sound system
  initSounds();

  const S = getCachedSelectors();

  await refreshCache();

  cacheRefreshInterval = setInterval(refreshCache, TIMING.CACHE_REFRESH_INTERVAL);

  await new Promise((resolve) => setTimeout(resolve, TIMING.INIT_DELAY));

  // Mark existing messages as processed
  const existingMessages = querySelectorAll(document, S.message);
  const initChat = getCurrentChatName() || 'unknown';
  existingMessages.forEach((el) => {
    el.setAttribute(DOM.PROCESSED_ATTR, 'true');
    const id = getAttr(el, ATTR.MESSAGE_MID) || 'init-' + Math.random();
    processedMessages.add(`${initChat}:${id}`);
  });

  // Start observers
  startObserver();
  startProfilePanelObserver();

  // Detect chat changes via URL hash
  window.addEventListener('hashchange', () => {
    invalidateSelectorCache();
    setTimeout(startObserver, 100);
  });

  // Observer health check - validate container
  observerCheckInterval = setInterval(() => {
    const currentContainer = querySelector(document, S.messageContainer);

    if (
      !observer ||
      !currentObservedContainer ||
      !currentObservedContainer.isConnected ||
      (currentContainer && currentContainer !== currentObservedContainer)
    ) {
      startObserver();
    }
  }, TIMING.OBSERVER_CHECK_INTERVAL);

  // Polling fallback - catch missed messages
  pollingInterval = setInterval(() => {
    scanRecentMessages(5, true);
  }, TIMING.POLLING_INTERVAL);

  isInitialized = true;
  logInfo('Content', 'TKA initialized, version:', detectVersion(), '| rules:', cachedRules?.length || 0);

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
}

function cleanup(): void {
  if (cacheRefreshInterval) clearInterval(cacheRefreshInterval);
  if (observerCheckInterval) clearInterval(observerCheckInterval);
  if (pollingInterval) clearInterval(pollingInterval);
  if (observer) observer.disconnect();
  stopProfilePanelObserver();
}

// ============== STORAGE CHANGE LISTENER ==============

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    refreshCache();
  }
});

// ============== MESSAGE HANDLERS ==============

function forceScanRecentMessages(): void {
  scanRecentMessages(5, false);
}

browser.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message.type === 'PING') {
      sendResponse({
        alive: true,
        initialized: isInitialized,
        currentChat: getCurrentChatName() ?? undefined,
      } satisfies PingResponse);
      return true;
    }

    if (message.type === 'FORCE_SCAN') {
      if (isInitialized) {
        forceScanRecentMessages();
      }
      sendResponse({ scanned: true } satisfies ForceScanResponse);
      return true;
    }

    if (message.type === 'CLEAR_PROCESSED_CACHE') {
      processedMessages.clear();
      lastPolledMids.clear();

      // Remove processed attribute from DOM elements
      document.querySelectorAll(`[${DOM.PROCESSED_ATTR}]`).forEach((el) => {
        el.removeAttribute(DOM.PROCESSED_ATTR);
      });

      // Re-scan current messages
      if (isInitialized) {
        processNewMessages();
      }

      logInfo('Content', 'In-memory cache cleared, messages re-scanned');
      sendResponse({ cleared: true } satisfies ClearCacheResponse);
      return true;
    }

    return false;
  }
);

// ============== EXPORT FOR WXT ==============

export default defineContentScript({
  matches: ['*://web.telegram.org/*'],
  runAt: 'document_idle',
  main() {
    if (document.readyState === 'complete') {
      init();
    } else {
      window.addEventListener('load', init);
    }
  },
});
