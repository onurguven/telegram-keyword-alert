/**
 * Telegram Keyword Alert - Storage Utilities
 * WXT storage API wrapper with typed storage items
 */

import { storage as wxtStorage } from 'wxt/utils/storage';
import type {
  Rule,
  RuleCondition,
  ChatFilter,
  Settings,
  HistoryEntry,
  NotifiedMessageId,
  ExportData,
} from '@/types/storage';
import { STORAGE } from '@/constants';
import { logError } from '@/utils/error-handling';

// Re-export types
export type {
  Rule,
  RuleCondition,
  ChatFilter,
  Settings,
  HistoryEntry,
  NotifiedMessageId,
  ExportData,
};

// ============== Default Values ==============

const defaultSettings: Settings = {
  // Notification settings
  soundEnabled: true,
  browserNotifications: true,
  toastNotifications: true,
  snoozeUntil: null,

  // Format settings
  showChatName: true,
  showSenderName: true,
  showMessagePreview: true,
  showMatchedKeyword: true,
  previewLength: 100,

  // UI settings
  theme: 'system',
  toastPosition: 'top-right',
  debugMode: false,
};

// ============== Storage Items ==============

export const rulesStorage = wxtStorage.defineItem<Rule[]>('local:rules', {
  fallback: [],
});

export const settingsStorage = wxtStorage.defineItem<Settings>('local:settings', {
  fallback: defaultSettings,
});

export const historyStorage = wxtStorage.defineItem<HistoryEntry[]>('local:history', {
  fallback: [],
});

export const badgeCountStorage = wxtStorage.defineItem<number>('local:badgeCount', {
  fallback: 0,
});

export const notifiedMessageIdsStorage = wxtStorage.defineItem<NotifiedMessageId[]>(
  'local:notifiedMessageIds',
  {
    fallback: [],
  }
);

// ============== Storage Helper Class ==============

// Queue for serializing notification ID checks (prevents race conditions)
let notificationQueue: Promise<void> = Promise.resolve();

export const Storage = {
  // ============== Generic Methods ==============

  /**
   * Get all data from storage
   */
  async getAll(): Promise<{
    rules: Rule[];
    settings: Settings;
    history: HistoryEntry[];
    badgeCount: number;
  }> {
    const [rawRules, settings, history, badgeCount] = await Promise.all([
      rulesStorage.getValue(),
      settingsStorage.getValue(),
      historyStorage.getValue(),
      badgeCountStorage.getValue(),
    ]);
    return { rules: structuredClone(rawRules), settings, history, badgeCount };
  },

  // ============== Rules ==============

  /**
   * Get all rules (returns deep copies to prevent reference sharing)
   */
  async getRules(): Promise<Rule[]> {
    const rules = await rulesStorage.getValue();
    return structuredClone(rules);
  },

  /**
   * Add a new rule
   */
  async addRule(rule: Partial<Rule>): Promise<Rule> {
    const rules = await rulesStorage.getValue();
    const newRule: Rule = {
      id: 'rule-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      name: rule.name || 'New Rule',
      enabled: true,
      conditions: rule.conditions ? structuredClone(rule.conditions) : [],
      matchMode: rule.matchMode || 'any',
      chats: rule.chats ? structuredClone(rule.chats) : [],
      sound: rule.sound || 'notification',
      color: rule.color || '#3390ec',
      createdAt: Date.now(),
    };
    rules.push(newRule);
    await rulesStorage.setValue(rules);
    return structuredClone(newRule);
  },

  /**
   * Update a rule
   */
  async updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule | null> {
    const rules = await rulesStorage.getValue();
    const index = rules.findIndex((r: Rule) => r.id === ruleId);
    if (index !== -1) {
      // Deep clone updates to prevent reference sharing
      rules[index] = structuredClone({ ...rules[index], ...updates });
      await rulesStorage.setValue(rules);
      return structuredClone(rules[index]);
    }
    return null;
  },

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const rules = await rulesStorage.getValue();
    const filtered = rules.filter((r: Rule) => r.id !== ruleId);
    await rulesStorage.setValue(filtered);
  },

  /**
   * Toggle rule enabled state
   */
  async toggleRule(ruleId: string): Promise<void> {
    const rules = await rulesStorage.getValue();
    const rule = rules.find((r: Rule) => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      await rulesStorage.setValue(rules);
    }
  },

  /**
   * Get rule by ID (returns a deep copy to prevent reference sharing)
   */
  async getRule(ruleId: string): Promise<Rule | null> {
    const rules = await rulesStorage.getValue();
    const rule = rules.find((r: Rule) => r.id === ruleId);
    return rule ? structuredClone(rule) : null;
  },

  // ============== Settings ==============

  /**
   * Get settings
   */
  async getSettings(): Promise<Settings> {
    return settingsStorage.getValue();
  },

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<Settings>): Promise<void> {
    const settings = await settingsStorage.getValue();
    await settingsStorage.setValue({ ...settings, ...updates });
  },

  /**
   * Set snooze
   */
  async setSnooze(minutes: number): Promise<void> {
    const settings = await settingsStorage.getValue();
    settings.snoozeUntil = minutes > 0 ? Date.now() + minutes * 60 * 1000 : null;
    await settingsStorage.setValue(settings);
  },

  /**
   * Check if snoozed
   */
  async isSnoozed(): Promise<boolean> {
    const settings = await settingsStorage.getValue();
    if (!settings.snoozeUntil) return false;
    if (Date.now() > settings.snoozeUntil) {
      settings.snoozeUntil = null;
      await settingsStorage.setValue(settings);
      return false;
    }
    return true;
  },

  // ============== History ==============

  /**
   * Get notification history
   */
  async getHistory(): Promise<HistoryEntry[]> {
    return historyStorage.getValue();
  },

  /**
   * Add to history (max 20 items)
   */
  async addToHistory(notification: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const history = await historyStorage.getValue();
    const entry: HistoryEntry = {
      id: 'notif-' + Date.now(),
      timestamp: Date.now(),
      ...notification,
    };
    history.unshift(entry);
    if (history.length > STORAGE.MAX_HISTORY_ITEMS) {
      history.pop();
    }
    await historyStorage.setValue(history);
  },

  /**
   * Clear history
   */
  async clearHistory(): Promise<void> {
    await historyStorage.setValue([]);
  },

  // ============== Badge ==============

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return badgeCountStorage.getValue();
  },

  /**
   * Increment badge count
   */
  async incrementBadge(): Promise<number> {
    const count = await badgeCountStorage.getValue();
    const newCount = count + 1;
    await badgeCountStorage.setValue(newCount);
    return newCount;
  },

  /**
   * Reset badge count
   */
  async resetBadge(): Promise<void> {
    await badgeCountStorage.setValue(0);
  },

  // ============== Notified Message IDs ==============

  /**
   * Atomically check if message was notified and mark it if not
   * Uses a queue to prevent race conditions when multiple tabs detect the same message
   * @returns true if duplicate, false if new
   */
  async checkAndAddNotifiedMessageId(messageKey: string): Promise<boolean> {
    return new Promise((resolve) => {
      notificationQueue = notificationQueue.then(async () => {
        let stored = await notifiedMessageIdsStorage.getValue();
        const now = Date.now();

        // Clean expired entries
        stored = stored.filter(
          (item: NotifiedMessageId) => now - item.timestamp < STORAGE.MESSAGE_ID_TTL_MS
        );

        // Check if already exists (DUPLICATE)
        const isDuplicate = stored.some(
          (item: NotifiedMessageId) => item.id === messageKey
        );

        if (isDuplicate) {
          resolve(true);
          return;
        }

        // Add new entry
        stored.push({ id: messageKey, timestamp: now });

        // Enforce size limit
        if (stored.length > STORAGE.MAX_NOTIFIED_IDS) {
          stored = stored.slice(-STORAGE.MAX_NOTIFIED_IDS);
        }

        await notifiedMessageIdsStorage.setValue(stored);
        resolve(false);
      });
    });
  },

  /**
   * Clear all notified message IDs
   */
  async clearNotifiedMessageIds(): Promise<void> {
    await notifiedMessageIdsStorage.setValue([]);
  },

  // ============== Export/Import ==============

  /**
   * Export all data
   */
  async exportData(): Promise<ExportData> {
    const { rules, settings, history } = await this.getAll();
    return {
      version: STORAGE.EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      data: { rules, settings, history },
    };
  },

  /**
   * Import data
   */
  async importData(importData: ExportData): Promise<boolean> {
    try {
      if (!importData.version || !importData.data) {
        throw new Error('Invalid import format');
      }
      const { data } = importData;

      if (data.rules) await rulesStorage.setValue(data.rules);
      if (data.settings)
        await settingsStorage.setValue({ ...defaultSettings, ...data.settings });
      if (data.history) await historyStorage.setValue(data.history);

      return true;
    } catch (e) {
      logError('Storage', e);
      return false;
    }
  },

  /**
   * Reset all data to defaults
   */
  async resetAll(): Promise<void> {
    await Promise.all([
      rulesStorage.setValue([]),
      settingsStorage.setValue(defaultSettings),
      historyStorage.setValue([]),
      badgeCountStorage.setValue(0),
      notifiedMessageIdsStorage.setValue([]),
    ]);
  },

  // ============== Watch Methods ==============

  /**
   * Watch for settings changes
   * @param callback - Function to call when settings change
   * @returns Unwatch function
   */
  watchSettings(callback: (newSettings: Settings) => void): () => void {
    return settingsStorage.watch((newValue) => {
      if (newValue) {
        callback(newValue);
      }
    });
  },
};

// Export as 'tkaStorage' to avoid conflicts with WXT's storage module
// Content scripts should import { tkaStorage } or { Storage }
export const tkaStorage = Storage;

export default Storage;
