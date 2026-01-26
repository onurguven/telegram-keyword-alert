/**
 * Telegram Keyword Alert - Help Page Script
 */

import './style.css';
import { Storage } from '@/utils/tka-storage';
import { i18n } from '#i18n';
import { applyI18n } from '@/utils/i18n';
import { initTheme, setupSystemThemeListener } from '@/composables/use-theme';
import { showSimpleToast } from '@/components/toast';

// ============== Notification Permission ==============

function setupNotificationPermission(): void {
  const btn = document.getElementById('enable-notifications-btn');
  const status = document.getElementById('notification-status');

  if (!btn || !status) return;

  function updatePermissionStatus(): void {
    if (!('Notification' in window)) {
      btn!.classList.add('hidden');
      status!.textContent = i18n.t('help_notificationsUnsupported') || 'Not supported in this browser';
      status!.className = 'notification-status status-denied';
      return;
    }

    const permission = Notification.permission;

    if (permission === 'granted') {
      btn!.classList.add('hidden');
      status!.textContent = i18n.t('help_notificationsEnabled') || 'Notifications enabled';
      status!.className = 'notification-status status-granted';
    } else if (permission === 'denied') {
      (btn as HTMLButtonElement).disabled = true;
      btn!.querySelector('span')!.textContent = i18n.t('help_notificationsBlocked') || 'Blocked by browser';
      status!.textContent = i18n.t('help_notificationsBlockedHint') || 'Enable in browser settings';
      status!.className = 'notification-status status-denied';
    }
    // 'default' state: button remains visible and enabled
  }

  updatePermissionStatus();

  btn.addEventListener('click', async () => {
    try {
      const permission = await Notification.requestPermission();
      updatePermissionStatus();

      if (permission === 'granted') {
        new Notification('Telegram Keyword Alert', {
          body: i18n.t('help_notificationsTestMessage') || 'Notifications are now enabled!',
          icon: '/icons/128.png'
        });
      }
    } catch (e) {
      console.error('Notification permission error:', e);
    }
  });
}

// ============== Data Management ==============

function setupDataManagement(): void {
  const exportBtn = document.getElementById('help-export-btn');
  const importBtn = document.getElementById('help-import-btn');
  const importFile = document.getElementById('help-import-file') as HTMLInputElement | null;
  const resetBtn = document.getElementById('help-reset-btn');

  // Export
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const data = await Storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telegram-keyword-alert-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSimpleToast(i18n.t('settings_data_exported') || 'Data exported', 'success', {});
    });
  }

  // Import
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });

    importFile.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const success = await Storage.importData(data);

        if (success) {
          showSimpleToast(i18n.t('settings_data_imported') || 'Data imported successfully', 'success', {});
        } else {
          showSimpleToast(i18n.t('settings_data_importError') || 'Invalid file format', 'error', {});
        }
      } catch {
        showSimpleToast(i18n.t('settings_data_fileError') || 'Could not read file', 'error', {});
      }

      importFile.value = '';
    });
  }

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const confirmMsg = i18n.t('settings_data_resetConfirm') || 'ALL data will be deleted and reset to defaults. Are you sure?';
      if (confirm(confirmMsg)) {
        await Storage.resetAll();
        showSimpleToast(i18n.t('settings_data_resetDone') || 'All data has been reset', 'success', {});
      }
    });
  }
}

// ============== Scroll to Hash ==============

function scrollToHashTarget(): void {
  const hash = window.location.hash;
  if (hash) {
    const target = document.querySelector(hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
}

// ============== Init ==============

document.addEventListener('DOMContentLoaded', async () => {
  // Apply i18n translations
  applyI18n();

  // Initialize theme
  await initTheme();
  setupSystemThemeListener();

  // Setup data management
  setupDataManagement();

  // Setup notification permission
  setupNotificationPermission();

  // Scroll to hash target if present
  scrollToHashTarget();
});
