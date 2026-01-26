/**
 * Theme Composable
 * Manages theme state and system preference detection
 */

import { Storage } from '@/utils/tka-storage';
import type { Theme } from '@/types/storage';

// Re-export Theme type for backward compatibility
export type { Theme };

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * Initialize theme from storage
 */
export async function initTheme(): Promise<void> {
  const settings = await Storage.getSettings();
  applyTheme((settings.theme || 'system') as Theme);
}

/**
 * Setup system theme change listener
 * Automatically updates theme when system preference changes
 */
export function setupSystemThemeListener(): void {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const settings = await Storage.getSettings();
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
}
