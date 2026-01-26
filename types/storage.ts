/**
 * Storage-related type definitions
 */

import type { ToastPosition } from './toast';

// Re-export ToastPosition for backwards compatibility
export type { ToastPosition };

// ============== Rule Types ==============

export interface RuleCondition {
  type: 'keyword' | 'user';
  values: string[];
  caseSensitive?: boolean;
}

export interface ChatFilter {
  name: string;
  id?: string;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  matchMode?: 'any' | 'all';
  chats?: (string | ChatFilter)[];
  sound?: string;
  color?: string;
  createdAt?: number;
}

// ============== Settings Types ==============

export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
  // Notification settings
  soundEnabled: boolean;
  browserNotifications: boolean;
  toastNotifications: boolean;
  snoozeUntil: number | null;

  // Format settings (flattened)
  showChatName: boolean;
  showSenderName: boolean;
  showMessagePreview: boolean;
  showMatchedKeyword: boolean;
  previewLength: number;

  // UI settings
  theme: Theme;
  toastPosition: ToastPosition;
  debugMode: boolean;
}


// ============== History Types ==============

export interface HistoryEntry {
  id: string;
  timestamp: number;
  chat?: string;
  sender?: string;
  message?: string;
  matchedKeywords: string[];
  matchedUser?: string;
  groupId?: string;
}

// ============== Message ID Tracking ==============

export interface NotifiedMessageId {
  id: string;
  timestamp: number;
}

// ============== Export/Import Types ==============

export interface ExportData {
  version: number;
  exportedAt: string;
  data: {
    rules: Rule[];
    settings: Settings;
    history: HistoryEntry[];
  };
}
