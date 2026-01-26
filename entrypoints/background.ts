/**
 * Telegram Keyword Alert - Background Script
 * Handles notifications, badge, and message passing
 */

import { Storage } from '@/utils/tka-storage';
import {
  type MessageData,
  type CheckAndNotifyResult,
  type TabStatus,
  type StatusResponse,
  type PingResponse,
  type BadgeCountResponse,
  type SuccessResponse,
  type ExtensionMessage,
  isValidMessage,
  isCheckAndNotifyMessage,
} from '@/types/messages';
import { getBrowserAction } from '@/types/browser';
import { UI, TIMING, PATHS } from '@/constants';
import { logError, logWarn, logInfo, logDebug, setDebugMode } from '@/utils/error-handling';

// ============== Constants ==============

const POLL_ALARM_NAME = 'poll-content-scripts';
const POLL_INTERVAL_MINUTES = 0.5 / 60; // 500ms = 0.5s = 0.5/60 minutes (minimum is 0.5 min in production)

// ============== Helper Functions ==============

/**
 * Create unique message key for deduplication
 */
function createMessageKey(data: MessageData): string {
  if (data.chatPeerId && data.messageId) {
    return `${data.chatPeerId}:${data.messageId}`;
  }
  if (data.messageId && data.messageId !== 'no-id' && data.chat) {
    return `name:${data.chat}:${data.messageId}`;
  }
  const content = `${data.chat || ''}|${data.sender || ''}|${(data.message || '').substring(0, 50)}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return `hash:${hash.toString(36)}`;
}

/**
 * Force content scripts to scan for new messages
 */
async function pollContentScripts(): Promise<void> {
  const tabs = await browser.tabs.query({ url: '*://web.telegram.org/*' });

  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'FORCE_SCAN' });
    } catch {
      logDebug('Poll', `Tab ${tab.id} not ready`);
    }
  }
}


/**
 * Update extension badge
 */
async function updateBadge(): Promise<void> {
  const count = await Storage.getBadgeCount();
  const text = count > 0
    ? (count > UI.BADGE_MAX_COUNT ? `${UI.BADGE_MAX_COUNT}+` : String(count))
    : '';

  const action = getBrowserAction();
  if (action) {
    await action.setBadgeText({ text });
    await action.setBadgeBackgroundColor({ color: '#e53935' });
  }
}

/**
 * Create browser notification
 */
async function createNotification(data: MessageData): Promise<string | null> {
  const settings = await Storage.getSettings();

  if (!settings.browserNotifications) {
    return null;
  }

  const messageParts: string[] = [];

  if (settings.showChatName && data.chat) {
    messageParts.push(`[${data.chat}]`);
  }

  if (settings.showSenderName && data.sender) {
    messageParts.push(data.sender + ':');
  }

  if (settings.showMessagePreview && data.message) {
    const preview = data.message.length > settings.previewLength
      ? data.message.substring(0, settings.previewLength) + '...'
      : data.message;
    messageParts.push(`"${preview}"`);
  }

  if (settings.showMatchedKeyword && data.matchedKeywords && data.matchedKeywords.length > 0) {
    messageParts.push(`\nMatched: ${data.matchedKeywords.join(', ')}`);
  }

  if (settings.showMatchedKeyword && data.matchedUser) {
    messageParts.push(`\nUser: @${data.matchedUser}`);
  }

  const notificationId = 'tka-' + Date.now();

  try {
    const iconUrl = browser.runtime.getURL(PATHS.ICON_128 as typeof PATHS.ICON_128);
    await browser.notifications.create(notificationId, {
      type: 'basic',
      iconUrl,
      title: 'Telegram Keyword Alert',
      message: messageParts.join(' ') || 'New notification',
    });
    return notificationId;
  } catch (e) {
    logError('Notification', e);
    return null;
  }
}

/**
 * Central notification handler - deduplication single source of truth
 */
async function handleCheckAndNotify(data: MessageData): Promise<CheckAndNotifyResult> {
  const messageKey = createMessageKey(data);

  const isDuplicate = await Storage.checkAndAddNotifiedMessageId(messageKey);
  if (isDuplicate) {
    return { shouldNotify: false, reason: 'duplicate' };
  }

  const snoozed = await Storage.isSnoozed();
  if (snoozed) {
    return { shouldNotify: false, reason: 'snoozed' };
  }

  await Storage.addToHistory({
    chat: data.chat,
    sender: data.sender,
    message: data.message,
    matchedKeywords: data.matchedKeywords || [],
    matchedUser: data.matchedUser,
    groupId: data.groupId,
  });

  await Storage.incrementBadge();
  await updateBadge();

  const notificationId = await createNotification(data);
  const settings = await Storage.getSettings();

  return {
    shouldNotify: true,
    notificationId,
    showToast: settings.toastNotifications,
    playSound: settings.soundEnabled,
    sound: data.sound || 'notification',
  };
}

/**
 * Ping tab with timeout
 */
async function pingTabWithTimeout(
  tabId: number,
  timeout: number = TIMING.TAB_PING_TIMEOUT
): Promise<PingResponse> {
  return Promise.race([
    browser.tabs.sendMessage(tabId, { type: 'PING' }) as Promise<PingResponse>,
    new Promise<PingResponse>((_, reject) =>
      setTimeout(() => reject(new Error('Ping timeout')), timeout)
    ),
  ]);
}

/**
 * Get extension status
 */
async function getExtensionStatus(): Promise<StatusResponse> {
  const tabs = await browser.tabs.query({ url: '*://web.telegram.org/*' });

  const telegramTabs: TabStatus[] = await Promise.all(
    tabs
      .filter((tab): tab is typeof tab & { id: number } => tab.id !== undefined)
      .map(async (tab) => {
        const tabStatus: TabStatus = {
          id: tab.id,
          chat: null,
          active: false,
          initialized: false,
        };

        try {
          const response = await pingTabWithTimeout(tab.id);
          tabStatus.active = response?.alive || false;
          tabStatus.initialized = response?.initialized || false;
          tabStatus.chat = response?.currentChat || null;
        } catch {
          logDebug('Status', `Tab ${tab.id} ping failed`);
          tabStatus.active = false;
        }

        return tabStatus;
      })
  );

  const snoozed = await Storage.isSnoozed();
  const settings = await Storage.getSettings();

  return {
    tabs: telegramTabs,
    tabCount: telegramTabs.length,
    activeCount: telegramTabs.filter((t) => t.active && t.initialized).length,
    snooze: {
      active: snoozed,
      until: settings.snoozeUntil || null,
    },
  };
}

// ============== Message Handlers ==============

type MessageHandler = (
  message: ExtensionMessage,
  sendResponse: (response?: unknown) => void
) => boolean;

const messageHandlers: Record<string, MessageHandler> = {
  GET_STATUS: (_msg, sendResponse) => {
    getExtensionStatus().then(sendResponse);
    return true;
  },

  CHECK_AND_NOTIFY: (msg, sendResponse) => {
    if (isCheckAndNotifyMessage(msg)) {
      handleCheckAndNotify(msg.data).then(sendResponse);
    } else {
      sendResponse({ shouldNotify: false, reason: 'invalid_data' });
    }
    return true;
  },

  GET_BADGE_COUNT: (_msg, sendResponse) => {
    Storage.getBadgeCount().then((count) =>
      sendResponse({ count } as BadgeCountResponse)
    );
    return true;
  },

  RESET_BADGE: (_msg, sendResponse) => {
    Storage.resetBadge().then(() => {
      updateBadge();
      sendResponse({ success: true } as SuccessResponse);
    });
    return true;
  },

  UPDATE_BADGE: (_msg, sendResponse) => {
    updateBadge().then(() =>
      sendResponse({ success: true } as SuccessResponse)
    );
    return true;
  },

  TEST_NOTIFICATION: (_msg, sendResponse) => {
    (async () => {
      try {
        const notificationId = 'tka-test-' + Date.now();
        const testMessage = `[Test Chat] Test User: "This is a test notification"\nMatched: "test"`;
        const iconUrl = browser.runtime.getURL(PATHS.ICON_128 as typeof PATHS.ICON_128);
        await browser.notifications.create(notificationId, {
          type: 'basic',
          iconUrl,
          title: 'Telegram Keyword Alert - Test',
          message: testMessage,
        });
        sendResponse({ success: true, notificationId } as SuccessResponse);
      } catch (e) {
        sendResponse({ success: false, error: (e as Error).message } as SuccessResponse);
      }
    })();
    return true;
  },

  CLEAR_ALL_CACHES: (_msg, sendResponse) => {
    (async () => {
      await Storage.clearNotifiedMessageIds();

      const tabs = await browser.tabs.query({ url: '*://web.telegram.org/*' });
      for (const tab of tabs) {
        if (tab.id === undefined) continue;
        try {
          await browser.tabs.sendMessage(tab.id, { type: 'CLEAR_PROCESSED_CACHE' });
        } catch {
          logDebug('ClearCache', `Tab ${tab.id} not ready`);
        }
      }

      logInfo('Background', 'All caches cleared');
      sendResponse({ success: true } as SuccessResponse);
    })();
    return true;
  },
};

// ============== Main Background Script ==============

export default defineBackground({
  async main() {
    // Initialize debug mode from settings
    const settings = await Storage.getSettings();
    setDebugMode(settings.debugMode);

    // Listen for settings changes to update debug mode
    Storage.watchSettings((newSettings) => {
      setDebugMode(newSettings.debugMode);
    });

    // Initialize badge on startup
    updateBadge();

    // Set up alarm for polling content scripts
    // Note: Chrome minimum alarm interval is 0.5 minutes in production
    // For development, we use a more frequent poll via alarms
    browser.alarms.create(POLL_ALARM_NAME, {
      periodInMinutes: Math.max(POLL_INTERVAL_MINUTES, 0.5)
    });

    // Handle alarm for polling
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === POLL_ALARM_NAME) {
        pollContentScripts();
      }
    });

    // Message handler
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isValidMessage(message)) {
        logWarn('Background', 'Invalid message received:', message);
        return false;
      }

      const handler = messageHandlers[message.type];
      if (handler) {
        return handler(message, sendResponse);
      }

      return false;
    });

    // Handle notification clicks
    browser.notifications.onClicked.addListener((notificationId) => {
      if (notificationId.startsWith('tka-')) {
        browser.tabs.query({ url: '*://web.telegram.org/*' }).then((tabs) => {
          if (tabs.length > 0 && tabs[0].id !== undefined) {
            browser.tabs.update(tabs[0].id, { active: true });
            if (tabs[0].windowId !== undefined) {
              browser.windows.update(tabs[0].windowId, { focused: true });
            }
          }
        });

        browser.notifications.clear(notificationId);
      }
    });

    // Listen for storage changes
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.badgeCount) {
        updateBadge();
      }
    });

    // Handle extension installation
    browser.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        browser.tabs.create({
          url: browser.runtime.getURL('/help.html' as never),
        });
      }
    });

    logInfo('Background', 'Telegram Keyword Alert initialized');
  },
});
