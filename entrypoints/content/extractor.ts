/**
 * Telegram Keyword Alert - Content Script: Message Extractor
 * Extracts message data from DOM elements (version-aware)
 */

import { MEMORY, DOM } from '@/constants';
import {
  ATTR,
  getCachedSelectors,
  getAttr,
  querySelector,
  isWebA,
  isOutgoingMessage,
  getCurrentChatName,
  type SelectorProfile,
} from '@/utils/telegram';
import { FifoSet } from '@/utils/fifo-set';

// ============== TYPES ==============

export interface MessageData {
  id: string;
  text: string;
  sender: string | null;
  senderId: string | null;
  chat: string | null;
  element: Element;
}

// ============== STATE ==============

// FifoSet automatically manages size limit - no manual trim needed
export const processedMessages = new FifoSet<string>(MEMORY.MAX_PROCESSED_MESSAGES);

// ============== HELPER FUNCTIONS ==============

/**
 * Extract message ID based on Telegram version
 */
function extractMessageId(messageEl: Element): string {
  if (isWebA()) {
    return (
      getAttr(messageEl, ATTR.MESSAGE_ID) ||
      getAttr(messageEl, ATTR.MESSAGE_MID) ||
      'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11)
    );
  }
  // Web K or fallback
  return (
    getAttr(messageEl, ATTR.MESSAGE_MID) ||
    getAttr(messageEl, ATTR.MESSAGE_ID) ||
    'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11)
  );
}

// ============== TEXT EXTRACTION ==============

/**
 * Extract raw text content from message element
 */
function extractText(messageEl: Element, selectors: SelectorProfile): string {
  const textEl = querySelector(messageEl, selectors.messageText);
  if (textEl) {
    return textEl.textContent?.trim() || '';
  }

  // Fallback: clone element and remove unwanted parts
  const clone = messageEl.cloneNode(true) as Element;
  selectors.elementsToClean.forEach((selector) => {
    try {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    } catch {
      // Invalid selector - skip
    }
  });
  return clone.textContent?.trim() || '';
}

/**
 * Clean extracted text (remove timestamps, invisible unicode)
 */
function cleanText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]*(\d{1,2}:\d{2})+\s*$/g, '')
    .trim();
}

// ============== SENDER EXTRACTION ==============

interface SenderInfo {
  sender: string | null;
  senderId: string | null;
}

/**
 * Extract sender name and peer ID from message element
 */
function extractSenderInfo(messageEl: Element, selectors: SelectorProfile): SenderInfo {
  let sender: string | null = null;
  let senderId: string | null = null;

  // Try to get peer ID from element or ancestor
  const peerIdEl =
    messageEl.querySelector(selectors.peerIdAttr) ||
    messageEl.closest(selectors.peerIdAttr);
  if (peerIdEl) {
    senderId = getAttr(peerIdEl, ATTR.PEER_ID);
  }

  // Try dedicated sender name element
  const senderEl = querySelector(messageEl, selectors.senderName);
  if (senderEl) {
    // Prefer inner element to avoid premium icons and decorations
    const innerEl = querySelector(senderEl, selectors.senderNameInner);
    sender = innerEl
      ? innerEl.textContent?.trim() || null
      : senderEl.textContent?.trim() || null;

    if (sender) {
      sender = sender.replace(DOM.UNICODE_CLEANUP_REGEX, '').trim();
    }

    // Try to get senderId from sender element if not found
    if (!senderId && senderEl.hasAttribute(ATTR.PEER_ID)) {
      senderId = getAttr(senderEl, ATTR.PEER_ID);
    }
    if (!senderId) {
      const peerParent = senderEl.closest(selectors.peerIdAttr);
      if (peerParent) {
        senderId = getAttr(peerParent, ATTR.PEER_ID);
      }
    }
  }

  return { sender, senderId };
}

// ============== MAIN EXTRACTOR ==============

export function extractMessageData(messageEl: Element): MessageData | null {
  const S = getCachedSelectors();
  const messageId = extractMessageId(messageEl);

  // Skip outgoing messages
  if (isOutgoingMessage(messageEl)) {
    return null;
  }

  // Check deduplication
  const currentChat = getCurrentChatName() || 'unknown';
  const uniqueKey = `${currentChat}:${messageId}`;

  if (processedMessages.has(uniqueKey)) {
    return null;
  }

  // Mark as processed
  messageEl.setAttribute(DOM.PROCESSED_ATTR, 'true');
  processedMessages.add(uniqueKey);

  // Extract and clean text
  const rawText = extractText(messageEl, S);
  const text = cleanText(rawText);

  if (!text || text.length < 1) {
    return null;
  }

  // Extract sender info
  const { sender, senderId } = extractSenderInfo(messageEl, S);

  return {
    id: messageId,
    text,
    sender,
    senderId,
    chat: getCurrentChatName(),
    element: messageEl,
  };
}
