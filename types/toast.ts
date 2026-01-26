/**
 * Toast Component Types
 */

export type ToastType = 'info' | 'success' | 'error';

export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface SimpleToastOptions {
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
}

export interface RichToastOptions {
  text: string;
  sender?: string | null;
  chat?: string | null;
  color?: string;
  keywords?: string[];
  element?: Element;
  position?: ToastPosition;
  duration?: number;
}
