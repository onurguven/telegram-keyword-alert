/**
 * Telegram Keyword Alert - Popup: Settings Module
 * Unified binding pattern for all boolean settings
 */

import { i18n } from '#i18n';
import { showToast } from './main';
import { Storage } from '@/utils/tka-storage';
import { applyTheme } from '@/composables/use-theme';
import { setToggleValue, setupToggleGroup, onClick } from '@/utils/ui';
import type { Settings, ToastPosition, Theme } from '@/types/storage';

// ============== Configuration ==============

// Single array for all boolean settings - compile-time validated
const BOOLEAN_KEYS = [
  'soundEnabled',
  'browserNotifications',
  'toastNotifications',
  'showChatName',
  'showSenderName',
  'showMessagePreview',
  'showMatchedKeyword',
  'debugMode',
] as const satisfies readonly (keyof Settings)[];

type BooleanKey = (typeof BOOLEAN_KEYS)[number];

// ============== Binding System ==============

interface Binding {
  load(settings: Settings): void;
  cleanup(): void;
}

function bindBooleanSettings(): Binding[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('[data-setting]'))
    .map((el) => {
      const key = el.dataset.setting;
      if (!key || !BOOLEAN_KEYS.includes(key as BooleanKey)) return null;

      const typedKey = key as BooleanKey;
      const handler = () => {
        Storage.updateSettings({ [typedKey]: el.checked });
        // Debug mode: toggle cache button visibility
        if (typedKey === 'debugMode') {
          document.getElementById('btn-clear-cache')?.classList.toggle('hidden', !el.checked);
        }
      };
      el.addEventListener('change', handler);

      return {
        load: (s: Settings) => {
          el.checked = s[typedKey] ?? false;
        },
        cleanup: () => el.removeEventListener('change', handler),
      };
    })
    .filter((b): b is Binding => b !== null);
}

// ============== State ==============

let bindings: Binding[] = [];

// ============== Public API ==============

/**
 * Load settings from storage and update UI
 */
export async function load(): Promise<void> {
  bindings = bindBooleanSettings();

  const settings = await Storage.getSettings();
  bindings.forEach((b) => b.load(settings));

  // Toggle groups
  setToggleValue('.theme-option', 'theme', settings.theme || 'system');
  setToggleValue('.position-option', 'position', settings.toastPosition || 'top-right');

  // Cache button visibility
  document.getElementById('btn-clear-cache')?.classList.toggle('hidden', !settings.debugMode);
}

/**
 * Setup settings event listeners
 */
export function setupListeners(): void {
  // Theme selector
  setupToggleGroup<Theme>({
    selector: '.theme-option',
    dataAttr: 'theme',
    onChange: async (theme) => {
      applyTheme(theme);
      await Storage.updateSettings({ theme });
    },
  });

  // Position selector
  setupToggleGroup<ToastPosition>({
    selector: '.position-option',
    dataAttr: 'position',
    onChange: (position) => Storage.updateSettings({ toastPosition: position }),
  });

  // Clear cache button
  onClick('btn-clear-cache', async () => {
    await browser.runtime.sendMessage({ type: 'CLEAR_ALL_CACHES' });
    showToast(i18n.t('settings_developer_cacheCleared'), 'success');
  });
}

/**
 * Setup export/import functionality
 */
export function setupExportImport(): void {
  onClick('btn-export', async () => {
    const data = await Storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telegram-keyword-alert-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(i18n.t('settings_data_exported'), 'success');
  });

  onClick('btn-import', () => {
    browser.tabs.create({ url: browser.runtime.getURL('/help.html#data-management') });
  });
}

