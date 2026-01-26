/**
 * Simple Toast - Lightweight toast for popup and help pages
 */

import { UI, TIMING } from '@/constants';
import { injectStyles } from '@/utils/style-injection';
import type { ToastType, ToastPosition, SimpleToastOptions } from '@/types/toast';
import toastStyles from './toast.css?inline';

const TOAST_STYLE_ID = 'tka-toast-styles';

/**
 * Show a simple toast notification
 * Used in popup and help pages
 */
export function showSimpleToast(
  message: string,
  type: ToastType = 'info',
  options: SimpleToastOptions = {}
): void {
  injectStyles(TOAST_STYLE_ID, toastStyles);

  // Remove existing simple toasts
  document.querySelectorAll('.tka-toast--simple').forEach((el) => el.remove());

  const {
    duration = UI.POPUP_TOAST_DURATION,
    position = 'bottom-right' as ToastPosition,
  } = options;

  const toast = document.createElement('div');
  toast.className = `tka-toast tka-toast--simple tka-toast--${type} tka-toast--${position}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('tka-toast--fade-out');
    setTimeout(() => toast.remove(), TIMING.TOAST_FADE_DURATION);
  }, duration);
}
