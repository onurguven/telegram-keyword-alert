/**
 * i18n Utilities
 * Apply translations to DOM elements with data-i18n attributes
 */

import { i18n } from '#i18n';

type Key = Parameters<typeof i18n.t>[0];

/**
 * Apply translations to all elements with data-i18n attributes
 */
export function applyI18n(): void {
  const t = (key: string) => i18n.t(key as Key);

  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.getAttribute('data-i18n')!);
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    (el as HTMLElement).title = t(el.getAttribute('data-i18n-title')!);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    (el as HTMLInputElement).placeholder = t(el.getAttribute('data-i18n-placeholder')!);
  }
}
