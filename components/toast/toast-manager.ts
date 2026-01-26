/**
 * Toast Manager - Manages stacked rich toast notifications
 */

import { UI, TIMING, DEFAULTS } from '@/constants';
import { injectStyles } from '@/utils/style-injection';
import type { RichToastOptions, ToastPosition } from '@/types/toast';
import { createRichToastElement } from './rich-toast';
import toastStyles from './toast.css?inline';

const TOAST_STYLE_ID = 'tka-toast-styles';

// ============== Types ==============

interface QueuedToast extends RichToastOptions {
  id: string;
}

interface ActiveToast {
  id: string;
  element: HTMLElement;
  timeout: ReturnType<typeof setTimeout> | null;
  remainingTime: number;
  pausedAt: number | null;
}

const POSITIONS: ToastPosition[] = ['top-left', 'bottom-left', 'bottom-right', 'top-right'];

// ============== Toast Manager Class ==============

class ToastManagerClass {
  private queue: QueuedToast[] = [];
  private activeToasts: ActiveToast[] = [];
  private toastCounter = 0;

  /**
   * Show a rich toast notification with stacking support
   */
  show(data: RichToastOptions): void {
    injectStyles(TOAST_STYLE_ID, toastStyles);

    const id = `tka-toast-${++this.toastCounter}`;
    const queuedToast: QueuedToast = { ...data, id };

    if (this.activeToasts.length < UI.MAX_VISIBLE_TOASTS) {
      this.displayToast(queuedToast);
    } else {
      this.queue.push(queuedToast);
    }
  }

  private displayToast(data: QueuedToast): void {
    const position: ToastPosition = data.position || DEFAULTS.TOAST_POSITION;
    const duration = data.duration || TIMING.TOAST_DISPLAY_DURATION;

    const element = createRichToastElement(
      data,
      {
        onRemove: () => this.removeToast(data.id),
        onPauseTimer: () => this.pauseToast(data.id),
        onResumeTimer: () => this.resumeToast(data.id),
      },
      duration
    );

    const stackIndex = this.activeToasts.length;
    this.applyStackPosition(element, position, stackIndex);

    document.body.appendChild(element);

    const activeToast: ActiveToast = {
      id: data.id,
      element,
      timeout: null,
      remainingTime: duration,
      pausedAt: null,
    };

    activeToast.timeout = setTimeout(() => {
      this.dismissToast(data.id);
    }, duration);

    this.activeToasts.push(activeToast);
  }

  private pauseToast(id: string): void {
    const toast = this.activeToasts.find((t) => t.id === id);
    if (!toast || toast.pausedAt !== null) return;

    if (toast.timeout) {
      clearTimeout(toast.timeout);
      toast.timeout = null;
    }

    toast.pausedAt = Date.now();
  }

  private resumeToast(id: string): void {
    const toast = this.activeToasts.find((t) => t.id === id);
    if (!toast || toast.pausedAt === null) return;

    const elapsed = Date.now() - toast.pausedAt;
    toast.remainingTime = Math.max(0, toast.remainingTime - elapsed);
    toast.pausedAt = null;

    if (toast.remainingTime > 0) {
      toast.timeout = setTimeout(() => {
        this.dismissToast(id);
      }, toast.remainingTime);
    } else {
      this.dismissToast(id);
    }
  }

  private applyStackPosition(
    element: HTMLElement,
    position: ToastPosition,
    stackIndex: number
  ): void {
    const baseOffset = UI.TOAST_BASE_OFFSET;
    const stackOffset = this.calculateStackOffset(stackIndex);

    element.style.top = '';
    element.style.bottom = '';
    element.style.left = '';
    element.style.right = '';

    if (position.includes('top')) {
      element.style.top = `${baseOffset + stackOffset}px`;
    } else {
      element.style.bottom = `${baseOffset + stackOffset}px`;
    }

    if (position.includes('left')) {
      element.style.left = `${baseOffset}px`;
    } else {
      element.style.right = `${baseOffset}px`;
    }
  }

  private calculateStackOffset(stackIndex: number): number {
    let offset = 0;

    for (let i = 0; i < stackIndex && i < this.activeToasts.length; i++) {
      const toast = this.activeToasts[i];
      if (toast.element) {
        const rect = toast.element.getBoundingClientRect();
        offset += rect.height + TIMING.TOAST_STACK_GAP;
      }
    }

    return offset;
  }

  private dismissToast(id: string): void {
    const toast = this.activeToasts.find((t) => t.id === id);
    if (!toast) return;

    toast.element.classList.add('tka-toast--fade-out');

    setTimeout(() => {
      this.removeToast(id);
    }, TIMING.TOAST_FADE_DURATION);
  }

  private removeToast(id: string): void {
    const index = this.activeToasts.findIndex((t) => t.id === id);
    if (index === -1) return;

    const toast = this.activeToasts[index];
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }
    toast.element.remove();
    this.activeToasts.splice(index, 1);

    this.updatePositions();
    this.showNextFromQueue();
  }

  private updatePositions(): void {
    const position: ToastPosition = this.activeToasts[0]?.element
      ? this.getPositionFromElement(this.activeToasts[0].element)
      : DEFAULTS.TOAST_POSITION;

    this.activeToasts.forEach((toast, index) => {
      toast.element.style.transition = 'top 0.3s ease, bottom 0.3s ease';
      this.applyStackPosition(toast.element, position, index);

      setTimeout(() => {
        toast.element.style.transition = '';
      }, TIMING.TOAST_FADE_DURATION);
    });
  }

  private getPositionFromElement(element: HTMLElement): ToastPosition {
    return POSITIONS.find((p) => element.classList.contains(`tka-toast--${p}`)) || DEFAULTS.TOAST_POSITION;
  }

  private showNextFromQueue(): void {
    if (this.queue.length === 0 || this.activeToasts.length >= UI.MAX_VISIBLE_TOASTS) return;

    const next = this.queue.shift();
    if (next) {
      this.displayToast(next);
    }
  }

  /**
   * Clear all active toasts and queued toasts
   */
  clear(): void {
    this.queue = [];
    for (const toast of this.activeToasts) {
      if (toast.timeout) {
        clearTimeout(toast.timeout);
      }
      toast.element.remove();
    }
    this.activeToasts = [];
  }
}

export const ToastManager = new ToastManagerClass();
