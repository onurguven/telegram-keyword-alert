/**
 * Telegram Keyword Alert - Popup: Main Module
 */

import './style.css';
import { i18n } from '#i18n';
import { applyI18n } from '@/utils/i18n';
import { initTheme, setupSystemThemeListener } from '@/composables/use-theme';
import { showSimpleToast } from '@/components/toast';
import { onClicks, onClick, confirmAction, renderList } from '@/utils/ui';
import * as tabs from './tabs';
import * as rules from './rules';
import * as settings from './settings';
import { Storage, type HistoryEntry } from '@/utils/tka-storage';
import { escapeHtml, highlightKeywords } from '@/utils/helpers';
import { UI } from '@/constants';
import type { SuccessResponse } from '@/types/messages';

/**
 * Initialize the popup
 */
async function init(): Promise<void> {
  // Apply i18n translations
  applyI18n();

  // Initialize and apply theme
  await initTheme();
  setupSystemThemeListener();

  // Setup UI
  setupHeaderButtons();
  setupSnoozeMenu();
  setupPanels();
  rules.setupEditPanel();
  setupEventListeners();

  // Load data
  await rules.load();
  await settings.load();
  await tabs.render();

  // Reset badge
  try {
    await browser.runtime.sendMessage({ type: 'RESET_BADGE' });
  } catch (e) {
    // Badge reset is not critical
  }

  // Start refresh interval
  setInterval(tabs.render, UI.ACTIVE_TABS_REFRESH_INTERVAL);
}

/**
 * Setup header button event listeners
 */
function setupHeaderButtons(): void {
  onClicks({
    'btn-history': () => {
      openPanel('panel-history');
      loadHistory();
    },
    'btn-settings': () => openPanel('panel-settings'),
    'btn-help': () => browser.tabs.create({ url: browser.runtime.getURL('/help.html') }),
    'btn-add-rule': () => rules.openEditPanel(),
  });
}

/**
 * Setup panel navigation
 */
function setupPanels(): void {
  document.querySelectorAll('[data-panel-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllPanels();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllPanels();
    }
  });
}

/**
 * Open a panel by ID
 */
export function openPanel(panelId: string): void {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.remove('hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add('visible');
      });
    });
  }
}

/**
 * Close all panels
 */
export function closeAllPanels(): void {
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.remove('visible');
    setTimeout(() => {
      panel.classList.add('hidden');
    }, UI.PANEL_ANIMATION_DURATION);
  });
}

/**
 * Load and render notification history
 */
async function loadHistory(): Promise<void> {
  const history = await Storage.getHistory();
  const locale = browser.i18n.getUILanguage().startsWith('tr') ? 'tr-TR' : 'en-US';

  renderList<HistoryEntry>({
    containerId: 'history-list',
    emptyStateId: 'history-empty',
    items: history,
    renderItem: (item) => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString(locale);
      const keywords = item.matchedKeywords || [];
      const highlightedMessage = highlightKeywords(item.message || '', keywords);

      return `
        <div class="history-item">
          <div class="history-item-header">
            <span>${escapeHtml(item.chat || i18n.t('history_unknownChat'))} - ${escapeHtml(item.sender || i18n.t('history_unknownSender'))}</span>
            <span>${dateStr} ${timeStr}</span>
          </div>
          <div class="history-item-message">${highlightedMessage}</div>
          ${item.matchedUser ? `<div class="history-item-badges"><span class="history-item-keyword">@${escapeHtml(item.matchedUser)}</span></div>` : ''}
        </div>
      `;
    },
  });
}

/**
 * Setup snooze menu
 */
function setupSnoozeMenu(): void {
  const snoozeBtn = document.getElementById('btn-snooze');
  const snoozeMenu = document.getElementById('snooze-menu');
  const snoozeStatus = document.getElementById('snooze-status');

  snoozeBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    snoozeMenu?.classList.toggle('hidden');

    const currentSettings = await Storage.getSettings();
    if (currentSettings.snoozeUntil && currentSettings.snoozeUntil > Date.now()) {
      const remaining = Math.ceil((currentSettings.snoozeUntil - Date.now()) / 60000);
      if (snoozeStatus) snoozeStatus.textContent = i18n.t('snooze_remaining', [remaining]);
    } else {
      if (snoozeStatus) snoozeStatus.textContent = '';
    }
  });

  document.addEventListener('click', () => {
    snoozeMenu?.classList.add('hidden');
  });

  snoozeMenu?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const minutes = parseInt((btn as HTMLElement).dataset.minutes || '0');
      await Storage.setSnooze(minutes);
      snoozeMenu?.classList.add('hidden');

      if (minutes > 0) {
        showToast(i18n.t('snooze_activated', [minutes]), 'success');
      } else {
        showToast(i18n.t('snooze_cancelled'), 'info');
      }

      await tabs.render();
    });
  });
}

/**
 * Setup general event listeners
 */
function setupEventListeners(): void {
  onClick('btn-clear-history', () =>
    confirmAction({
      message: i18n.t('history_clearConfirm'),
      action: () => Storage.clearHistory(),
      onSuccess: loadHistory,
      successMessage: i18n.t('history_cleared'),
    })
  );

  settings.setupListeners();
  settings.setupExportImport();

  onClick('btn-reset', () =>
    confirmAction({
      message: i18n.t('settings_data_resetConfirm'),
      action: () => Storage.resetAll(),
      onSuccess: async () => {
        await rules.load();
        await settings.load();
      },
      successMessage: i18n.t('settings_data_resetDone'),
    })
  );

  onClick('btn-test', async () => {
    try {
      showToast(i18n.t('test_sending'), 'info');
      const response = (await browser.runtime.sendMessage({
        type: 'TEST_NOTIFICATION',
      })) as SuccessResponse;

      if (response?.success) {
        showToast(i18n.t('test_success'), 'success');
      } else {
        showToast(i18n.t('test_error') + ': ' + (response?.error || ''), 'error');
      }
    } catch (e) {
      const error = e as Error;
      showToast(i18n.t('common_error') + ': ' + error.message, 'error');
    }
  });
}

/**
 * Show a toast notification (wrapper for popup-specific styling)
 */
export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  showSimpleToast(message, type, {
    duration: UI.POPUP_TOAST_DURATION,
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
