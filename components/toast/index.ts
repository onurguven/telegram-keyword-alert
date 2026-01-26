/**
 * Toast Component - Main Entry Point
 */

// Type re-exports
export type {
  ToastType,
  ToastPosition,
  SimpleToastOptions,
  RichToastOptions,
} from '@/types/toast';

// Function re-exports
export { showSimpleToast } from './simple-toast';
export { ToastManager } from './toast-manager';
