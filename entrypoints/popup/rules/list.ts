/**
 * Rules module - List rendering
 */

import { i18n } from '#i18n';
import { escapeHtml, escapeAttr } from '@/utils/helpers';
import { Storage, type Rule } from '@/utils/tka-storage';
import { renderList, confirmAction } from '@/utils/ui';
import { openEditPanel } from './editor';

/**
 * Load and render all rules
 */
export async function load(): Promise<void> {
  const rules = await Storage.getRules();

  renderList<Rule>({
    containerId: 'rules-list',
    emptyStateId: 'rules-empty',
    items: rules,
    renderItem: renderCard,
    onRender: (container) => {
      container.querySelectorAll('.rule-card').forEach((card) => {
        const ruleId = (card as HTMLElement).dataset.ruleId || '';

        card.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.rule-card-actions')) return;
          openEditPanel(ruleId);
        });

        card.querySelector('.btn-toggle')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          await Storage.toggleRule(ruleId);
          await load();
        });

        card.querySelector('.btn-delete')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          await confirmAction({
            message: i18n.t('rules_deleteConfirm'),
            action: () => Storage.deleteRule(ruleId),
            onSuccess: load,
            successMessage: i18n.t('rules_deleted'),
          });
        });
      });
    },
  });
}

/**
 * Render a single rule card
 */
function renderCard(rule: Rule): string {
  const keywordCondition = (rule.conditions || []).find(c => c.type === 'keyword');
  const userCondition = (rule.conditions || []).find(c => c.type === 'user');

  const keywordsText = keywordCondition && keywordCondition.values.length > 0
    ? keywordCondition.values.slice(0, 5).join(', ') + (keywordCondition.values.length > 5 ? '...' : '')
    : '';

  const usersText = userCondition && userCondition.values.length > 0
    ? userCondition.values.slice(0, 3).join(', ') + (userCondition.values.length > 3 ? '...' : '')
    : '';

  const chats = rule.chats || [];
  const chatNames = chats.map(c => typeof c === 'string' ? c : c.name);
  const chatsText = chatNames.length > 0
    ? chatNames.slice(0, 3).join(', ') + (chatNames.length > 3 ? '...' : '')
    : i18n.t('rules_allChats');

  const iconCheck = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  const iconCircle = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
  const iconTrash = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

  return `
    <div class="rule-card ${rule.enabled ? '' : 'disabled'}" data-rule-id="${escapeAttr(rule.id)}">
      <div class="rule-card-header">
        <div class="rule-card-title">
          <span class="rule-color-dot" style="background: ${escapeAttr(rule.color || '#3390ec')}"></span>
          <span class="rule-card-name">${escapeHtml(rule.name)}</span>
        </div>
        <div class="rule-card-actions">
          <button class="btn-toggle ${rule.enabled ? 'enabled' : ''}" title="${i18n.t('rules_enabled')}">
            ${rule.enabled ? iconCheck : iconCircle}
          </button>
          <button class="btn-delete" title="${i18n.t('rules_delete')}">${iconTrash}</button>
        </div>
      </div>
      <div class="rule-card-details">
        ${keywordsText ? `<div><span class="detail-text">${escapeHtml(keywordsText)}</span></div>` : ''}
        ${usersText ? `<div><span class="detail-text">${escapeHtml(usersText)}</span></div>` : ''}
        ${chats.length > 0 ? `<div><span class="detail-label">#</span><span class="detail-text">${escapeHtml(chatsText)}</span></div>` : ''}
      </div>
    </div>
  `;
}
