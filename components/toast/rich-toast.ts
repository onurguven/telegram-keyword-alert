/**
 * Rich Toast - Full-featured toast for content script notifications
 */

import { highlightKeywords } from '@/utils/helpers';
import { UI, TIMING, DEFAULTS } from '@/constants';
import type { RichToastOptions, ToastPosition } from '@/types/toast';

// ============== Header Builder ==============

function createHeader(data: RichToastOptions): HTMLElement {
  const header = document.createElement('div');
  header.className = 'tka-toast__header';

  const senderEl = document.createElement('span');
  senderEl.className = 'tka-toast__sender';

  if (data.chat && data.sender) {
    senderEl.textContent = data.sender;
    const chatEl = document.createElement('span');
    chatEl.className = 'tka-toast__chat';
    chatEl.textContent = `${browser.i18n.getMessage('toast_chatPrefix')} ${data.chat}`;
    header.appendChild(senderEl);
    header.appendChild(chatEl);
  } else {
    senderEl.textContent = data.sender || data.chat || UI.TOAST_FALLBACK_SENDER;
    header.appendChild(senderEl);
  }

  return header;
}

// ============== Message Builder ==============

function createMessage(data: RichToastOptions): HTMLElement {
  const messageText =
    data.text.length > UI.MESSAGE_PREVIEW_LENGTH
      ? data.text.substring(0, UI.MESSAGE_PREVIEW_LENGTH) + '...'
      : data.text;

  const messageEl = document.createElement('div');
  messageEl.className = 'tka-toast__message';
  messageEl.innerHTML = highlightKeywords(messageText, data.keywords || [], 'tka-toast__highlight');

  return messageEl;
}

// ============== Close Button Builder ==============

function createCloseButton(onClose: () => void): HTMLElement {
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tka-toast__close';
  closeBtn.innerHTML = '×';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });

  return closeBtn;
}

// ============== Main Element Builder ==============

export interface RichToastCallbacks {
  onRemove: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
}

/**
 * Create a rich toast element with full notification features
 */
export function createRichToastElement(
  data: RichToastOptions,
  callbacks: RichToastCallbacks,
  duration: number
): HTMLElement {
  const position: ToastPosition = data.position || DEFAULTS.TOAST_POSITION;
  const accentColor = data.color || UI.TOAST_ACCENT_COLOR;

  const toast = document.createElement('div');
  toast.className = `tka-toast tka-toast--rich tka-toast--${position}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  // Accent bar with progress animation
  const accentBar = document.createElement('div');
  accentBar.className = 'tka-toast__accent';
  accentBar.style.background = accentColor;
  accentBar.style.animationDuration = `${duration}ms`;
  toast.appendChild(accentBar);

  // Content container
  const content = document.createElement('div');
  content.className = 'tka-toast__content';

  // Header
  content.appendChild(createHeader(data));

  // Message
  content.appendChild(createMessage(data));

  // Close button (inside content for positioning)
  const closeBtn = createCloseButton(callbacks.onRemove);
  content.appendChild(closeBtn);

  toast.appendChild(content);

  // Hover pause
  toast.addEventListener('mouseenter', () => {
    toast.classList.add('tka-toast--paused');
    callbacks.onPauseTimer();
  });

  toast.addEventListener('mouseleave', () => {
    toast.classList.remove('tka-toast--paused');
    callbacks.onResumeTimer();
  });

  // Click handler - scroll to element
  toast.addEventListener('click', () => {
    if (data.element) {
      data.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const htmlElement = data.element as HTMLElement;
      htmlElement.style.animation = `tka-highlight ${TIMING.HIGHLIGHT_ANIMATION_DURATION}ms ease`;
      setTimeout(() => {
        htmlElement.style.animation = '';
      }, TIMING.HIGHLIGHT_ANIMATION_DURATION);
    }
    callbacks.onRemove();
  });

  return toast;
}
