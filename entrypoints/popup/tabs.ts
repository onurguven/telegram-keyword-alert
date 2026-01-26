/**
 * Telegram Keyword Alert - Popup: Active Tabs Module
 */

import { i18n } from '#i18n';
import { escapeHtml } from '@/utils/helpers';
import { logError } from '@/utils/error-handling';

interface TabStatus {
  id: number;
  active: boolean;
  initialized: boolean;
  chat?: string;
}

interface StatusResponse {
  loading?: boolean;
  error?: boolean;
  tabCount: number;
  activeCount: number;
  tabs: TabStatus[];
  snooze: {
    active: boolean;
    until?: number;
  };
}

let isInitialLoad = true;
let loadingTimer: ReturnType<typeof setTimeout> | null = null;

const LOADING_DELAY_THRESHOLD = 300;

/**
 * Render active Telegram tabs
 */
export async function render(): Promise<void> {
  const container = document.getElementById('active-tabs');
  if (!container) return;

  if (isInitialLoad) {
    updateStatusBadge({ loading: true });
  } else {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
    }
    loadingTimer = setTimeout(() => {
      updateStatusBadge({ loading: true });
    }, LOADING_DELAY_THRESHOLD);
  }

  try {
    const status = await browser.runtime.sendMessage({ type: 'GET_STATUS' }) as StatusResponse;

    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }

    isInitialLoad = false;
    updateStatusBadge(status);

    const snoozeBtn = document.getElementById('btn-snooze');
    if (snoozeBtn) {
      snoozeBtn.classList.toggle('snoozed', status.snooze.active);
    }

    if (status.tabCount === 0) {
      container.innerHTML = `<span class="no-tabs-message">${i18n.t('activeTabs_noTabs')}</span>`;
      return;
    }

    container.innerHTML = status.tabs.map(tab => {
      const isActive = tab.active && tab.initialized;
      const chatName = tab.chat || i18n.t('status_unknown');
      return `
        <div class="tab-chip ${isActive ? 'active' : 'inactive'}"
             data-tab-id="${tab.id}"
             title="${i18n.t('activeTabs_clickToFocus')}">
          <span class="chip-dot"></span>
          <span class="chip-name">${escapeHtml(chatName)}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.tab-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tabId = parseInt((chip as HTMLElement).dataset.tabId || '0');
        focusTab(tabId);
      });
    });

  } catch (e) {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    isInitialLoad = false;
    updateStatusBadge({ error: true });
    container.innerHTML = `<span class="no-tabs-message">${i18n.t('status_error')}</span>`;
  }
}

interface BadgeStatus {
  loading?: boolean;
  error?: boolean;
  tabCount?: number;
  activeCount?: number;
  snooze?: {
    active: boolean;
    until?: number;
  };
}

/**
 * Update the status badge in the header
 */
function updateStatusBadge(status: BadgeStatus): void {
  const badge = document.getElementById('status-badge');
  if (!badge) return;

  const text = badge.querySelector('.status-badge-text');
  if (!text) return;

  if (status.loading) {
    badge.classList.add('loading');
    badge.classList.remove('active', 'partial', 'snoozed', 'error');
    text.textContent = '...';
    return;
  }

  badge.classList.remove('loading', 'active', 'partial', 'snoozed', 'error');

  if (status.error) {
    badge.classList.add('error');
    text.textContent = '!';
    badge.title = i18n.t('status_error');
    return;
  }

  if (status.snooze?.active) {
    badge.classList.add('snoozed');
    const remaining = Math.ceil(((status.snooze.until || 0) - Date.now()) / 60000);
    text.textContent = `${remaining}m`;
    badge.title = i18n.t('snooze_remaining', [remaining]);
    return;
  }

  if (status.tabCount === 0) {
    text.textContent = '0';
    badge.title = i18n.t('activeTabs_noTabs');
    return;
  }

  if (status.activeCount === status.tabCount) {
    badge.classList.add('active');
  } else {
    badge.classList.add('partial');
  }

  text.textContent = `${status.activeCount}/${status.tabCount}`;
  badge.title = i18n.t('status_tabsActive', [status.activeCount || 0, status.tabCount || 0]);
}

/**
 * Focus a specific tab
 */
async function focusTab(tabId: number): Promise<void> {
  try {
    const tab = await browser.tabs.get(tabId);
    await browser.tabs.update(tabId, { active: true });
    await browser.windows.update(tab.windowId!, { focused: true });
  } catch (e) {
    logError('Tabs', e);
  }
}
