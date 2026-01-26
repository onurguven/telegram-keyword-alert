/**
 * Telegram Keyword Alert - Content Script: User ID
 * User ID injection into Telegram profile panels
 */

import { TIMING, DOM, UI } from '@/constants';
import { ATTR, getCachedSelectors, getAttr, isProfilePanel, querySelector } from '@/utils/telegram';
import { ToastManager } from '@/components/toast';
import { logError } from '@/utils/error-handling';
import { i18n } from '#i18n';

// ============== HELPER FUNCTIONS ==============

/**
 * Extract user/peer ID from profile panel element
 */
function extractUserIdFromPanel(panelElement: Element): string | null {
  const S = getCachedSelectors();

  // Try direct attribute
  const peerIdEl = panelElement.querySelector(S.peerIdAttr);
  if (peerIdEl) {
    return getAttr(peerIdEl, ATTR.PEER_ID);
  }

  // Try parent
  const parent = panelElement.closest(S.peerIdAttr);
  if (parent) {
    return getAttr(parent, ATTR.PEER_ID);
  }

  return null;
}

/**
 * Create user ID row element with copy button
 */
function createUserIdRow(userId: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'tka-user-id-row';
  row.innerHTML = `
    <span class="tka-user-id-label">ID</span>
    <span class="tka-user-id-value">${userId}</span>
    <button class="tka-copy-btn">Copy</button>
  `;

  const copyBtn = row.querySelector('.tka-copy-btn');
  copyBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard
      .writeText(userId)
      .then(() => {
        ToastManager.show({
          text: i18n.t('toast_userIdCopied'),
          color: UI.SUCCESS_COLOR,
        });
      })
      .catch((err) => {
        logError('Clipboard', err);
      });
  });

  return row;
}

// ============== INJECTION FUNCTION ==============

/**
 * Inject user ID field into profile panel
 */
function injectUserIdField(panelElement: Element): void {
  const S = getCachedSelectors();

  // Already injected?
  if (panelElement.hasAttribute(DOM.PROFILE_INJECTED_ATTR)) {
    return;
  }

  const userId = extractUserIdFromPanel(panelElement);
  if (!userId) {
    return;
  }

  const infoSection = querySelector(panelElement, S.profileInfoSection);
  if (!infoSection) {
    return;
  }

  const userIdRow = createUserIdRow(userId);

  if (infoSection.firstChild) {
    infoSection.insertBefore(userIdRow, infoSection.firstChild);
  } else {
    infoSection.appendChild(userIdRow);
  }

  panelElement.setAttribute(DOM.PROFILE_INJECTED_ATTR, 'true');
}

// ============== OBSERVER ==============

let profileObserver: MutationObserver | null = null;

/**
 * Start observing for profile panel changes
 */
export function startProfilePanelObserver(): void {
  // Cleanup existing observer if any
  stopProfilePanelObserver();

  const S = getCachedSelectors();

  profileObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;

      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const element = node as Element;
        let panel: Element | null = null;

        if (isProfilePanel(element)) {
          panel = element;
        } else {
          panel = querySelector(element, S.profilePanel);
        }

        if (panel && !panel.hasAttribute(DOM.PROFILE_INJECTED_ATTR)) {
          setTimeout(() => injectUserIdField(panel!), TIMING.INJECTION_DELAY);
        }
      }
    }
  });

  profileObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Check for existing panel on load
  setTimeout(() => {
    const existingPanel = querySelector(document, S.profilePanel);
    if (existingPanel && !existingPanel.hasAttribute(DOM.PROFILE_INJECTED_ATTR)) {
      injectUserIdField(existingPanel);
    }
  }, TIMING.PROFILE_PANEL_CHECK_DELAY);
}

/**
 * Stop the profile panel observer and cleanup
 */
export function stopProfilePanelObserver(): void {
  if (profileObserver) {
    profileObserver.disconnect();
    profileObserver = null;
  }
}
