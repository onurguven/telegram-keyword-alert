/**
 * UI Utilities - Reusable DOM helpers
 */

import { showSimpleToast } from '@/components/toast';

// ============== BUTTON HANDLERS ==============

/**
 * getElementById + addEventListener shortcut (supports async handlers)
 */
export function onClick(
  id: string,
  handler: () => void | Promise<unknown>
): void {
  document.getElementById(id)?.addEventListener('click', () => handler());
}

/**
 * Batch click handlers for multiple buttons
 */
export function onClicks(
  handlers: Record<string, () => void | Promise<unknown>>
): void {
  Object.entries(handlers).forEach(([id, handler]) => onClick(id, handler));
}

// ============== TOGGLE GROUPS ==============

/**
 * Toggle button group - select one from many pattern
 */
export function setupToggleGroup<T extends string>(options: {
  selector: string;
  dataAttr: string;
  onChange: (value: T) => void | Promise<void>;
}): void {
  document.querySelectorAll(options.selector).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = (btn as HTMLElement).dataset[options.dataAttr] as T;
      document
        .querySelectorAll(options.selector)
        .forEach((b) => b.classList.toggle('active', b === btn));
      await options.onChange(value);
    });
  });
}

/**
 * Set active value in toggle group
 */
export function setToggleValue(
  selector: string,
  dataAttr: string,
  value: string
): void {
  document.querySelectorAll(selector).forEach((btn) => {
    const el = btn as HTMLElement;
    btn.classList.toggle('active', el.dataset[dataAttr] === value);
  });
}

// ============== CONFIRM ACTIONS ==============

/**
 * Confirm → Action → Reload → Toast pattern
 */
export async function confirmAction(options: {
  message: string;
  action: () => Promise<void>;
  onSuccess?: () => void | Promise<void>;
  successMessage?: string;
}): Promise<boolean> {
  if (!confirm(options.message)) return false;

  await options.action();
  if (options.onSuccess) await options.onSuccess();
  if (options.successMessage) {
    showSimpleToast(options.successMessage, 'success');
  }
  return true;
}

// ============== EMPTY STATE ==============

/**
 * Empty state toggle + list render
 */
export function renderList<T>(options: {
  containerId: string;
  emptyStateId: string;
  items: T[];
  renderItem: (item: T) => string;
  onRender?: (container: HTMLElement) => void;
}): void {
  const container = document.getElementById(options.containerId);
  const emptyState = document.getElementById(options.emptyStateId);
  if (!container || !emptyState) return;

  if (options.items.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = options.items.map(options.renderItem).join('');

  if (options.onRender) {
    options.onRender(container);
  }
}
