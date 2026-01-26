/**
 * Telegram Keyword Alert - Content Script: Notifier
 * Triggers notifications (toast, sound, browser notification)
 */

import { browser } from 'wxt/browser';
import { getCurrentChatPeerId } from '@/utils/telegram';
import { type RuleMatchResult } from './matcher';
import type { MessageData } from './extractor';
import { ToastManager } from '@/components/toast';
import { cachedSettings } from './matcher';
import { logError, logDebug } from '@/utils/error-handling';

// ============== SOUND ==============

declare global {
  interface Window {
    TKASounds?: {
      play: (soundType: string) => Promise<void>;
    };
  }
}

export function playSound(soundType: string): void {
  try {
    if (window.TKASounds) {
      window.TKASounds.play(soundType);
    }
  } catch (e) {
    logError('Sound', e);
  }
}

// ============== TRIGGER NOTIFICATION ==============

export async function triggerNotification(
  messageData: MessageData,
  match: RuleMatchResult
): Promise<void> {
  logDebug('Notifier', 'Notification triggered:', messageData.chat, '->', messageData.sender);
  try {
    const response = await browser.runtime.sendMessage({
      type: 'CHECK_AND_NOTIFY',
      data: {
        messageId: messageData.id,
        chatPeerId: getCurrentChatPeerId(),
        chat: messageData.chat,
        sender: messageData.sender,
        message: messageData.text,
        matchedKeywords: match.keywords || [],
        matchedUser: match.username || null,
        groupId: match.ruleId || null,
        sound: match.sound || 'notification',
        color: match.color,
      },
    });

    if (response?.shouldNotify) {
      response.showToast &&
        ToastManager.show({
          text: messageData.text,
          sender: messageData.sender,
          chat: messageData.chat,
          color: match.color,
          keywords: match.keywords,
          element: messageData.element,
          position: cachedSettings?.toastPosition || 'top-right',
        });
      response.playSound && playSound(response.sound);
    }
  } catch (e) {
    logError('Notification', e);
  }
}
