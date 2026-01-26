/**
 * Extension message types for communication between background and content scripts
 */

// Message types for background script
export type BackgroundMessageType =
  | 'PING'
  | 'GET_STATUS'
  | 'CHECK_AND_NOTIFY'
  | 'GET_BADGE_COUNT'
  | 'RESET_BADGE'
  | 'UPDATE_BADGE'
  | 'TEST_NOTIFICATION'
  | 'CLEAR_ALL_CACHES';

// Message types sent to content scripts
export type ContentScriptMessageType = 'FORCE_SCAN' | 'CLEAR_PROCESSED_CACHE' | 'PING';

// All message types
export type MessageType = BackgroundMessageType | ContentScriptMessageType;

// Base message interface
export interface ExtensionMessage {
  type: MessageType;
  data?: unknown;
}

// Message with data payload (used by CHECK_AND_NOTIFY)
export interface CheckAndNotifyMessage {
  type: 'CHECK_AND_NOTIFY';
  data: MessageData;
}

// Message data types
export interface MessageData {
  chatPeerId?: string;
  messageId?: string;
  chat?: string;
  sender?: string;
  message?: string;
  matchedKeywords?: string[];
  matchedUser?: string;
  groupId?: string;
  sound?: string;
}

// Response types
export interface PingResponse {
  alive?: boolean;
  initialized?: boolean;
  currentChat?: string;
}

export interface StatusResponse {
  tabs: TabStatus[];
  tabCount: number;
  activeCount: number;
  snooze: {
    active: boolean;
    until: number | null;
  };
}

export interface TabStatus {
  id: number;
  chat: string | null;
  active: boolean;
  initialized: boolean;
}

export interface CheckAndNotifyResult {
  shouldNotify: boolean;
  reason?: string;
  notificationId?: string | null;
  showToast?: boolean;
  playSound?: boolean;
  sound?: string;
}

export interface BadgeCountResponse {
  count: number;
}

export interface SuccessResponse {
  success: boolean;
  error?: string;
  notificationId?: string;
}

// Content script response types
export interface ForceScanResponse {
  scanned: boolean;
}

export interface ClearCacheResponse {
  cleared: boolean;
}

// Type guard for validating messages
export function isValidMessage(msg: unknown): msg is ExtensionMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as ExtensionMessage).type === 'string'
  );
}

// Type guard for CHECK_AND_NOTIFY message
export function isCheckAndNotifyMessage(msg: ExtensionMessage): msg is CheckAndNotifyMessage {
  return msg.type === 'CHECK_AND_NOTIFY' && 'data' in msg;
}
