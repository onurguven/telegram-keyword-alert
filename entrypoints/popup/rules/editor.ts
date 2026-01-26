/**
 * Rules module - Edit panel
 * Uses ChipInput and ColorPicker components
 */

import { i18n } from '#i18n';
import { Storage, type RuleCondition } from '@/utils/tka-storage';
import { SoundGenerator } from '@/utils/sounds';
import { ChipInput } from '@/components/chip-input';
import { ColorPicker } from '@/components/color-picker';
import { onClick, setupToggleGroup, setToggleValue } from '@/utils/ui';
import { openPanel, closeAllPanels, showToast } from '../main';
import { load } from './list';

// ============== STATE ==============

let editingRuleId: string | null = null;
const FOCUS_DELAY = 300;

// ============== TYPES ==============

interface UserChipItem {
  id: string;
  name: string;
}

// ============== COMPONENT INSTANCES ==============

let userChipInput: ChipInput<UserChipItem> | null = null;
let chatChipInput: ChipInput<string> | null = null;
let colorPicker: ColorPicker | null = null;

// ============== SETUP ==============

/**
 * Initialize edit panel event listeners
 */
export function setupEditPanel(): void {
  onClick('btn-save-rule', save);

  onClick('btn-preview-sound', () => {
    const soundSelect = document.getElementById(
      'rule-sound'
    ) as HTMLSelectElement | null;
    const soundType = soundSelect?.value || 'notification';
    SoundGenerator.play(soundType);
  });

  // Initialize User ChipInput
  userChipInput = new ChipInput<UserChipItem>({
    containerId: 'users-chip-input',
    inputId: 'rule-user-input',
    listId: 'rule-users-list',
    getDisplayName: (item) => item.name || item.id,
    parseInput: (value) => {
      const isId = /^\d+$/.test(value);
      return { id: isId ? value : '', name: isId ? '' : value };
    },
    checkDuplicate: (item, items) => {
      const isId = item.id !== '';
      return items.some(u =>
        (isId && u.id === item.id) || (!isId && u.name.toLowerCase() === item.name.toLowerCase())
      );
    },
    onDuplicate: () => {
      showToast(i18n.t('rules_userExists') || 'User already exists', 'error');
    },
  });

  // Initialize Chat ChipInput
  chatChipInput = new ChipInput<string>({
    containerId: 'chats-chip-input',
    inputId: 'rule-chat-input',
    listId: 'rule-chats-list',
    getDisplayName: (item) => item,
    parseInput: (value) => value,
    checkDuplicate: (item, items) => {
      return items.some(c => c.toLowerCase() === item.toLowerCase());
    },
    onDuplicate: () => {
      showToast(i18n.t('rules_chatExists') || 'Chat already exists', 'error');
    },
  });

  // Initialize ColorPicker
  colorPicker = new ColorPicker({
    containerId: 'color-presets',
    inputId: 'rule-color',
  });

  // Match mode toggle
  setupToggleGroup({
    selector: '.match-mode-btn',
    dataAttr: 'mode',
    onChange: () => {}, // No action needed, just UI toggle
  });
}

function getMatchMode(): 'any' | 'all' {
  const activeBtn = document.querySelector('.match-mode-btn.active') as HTMLElement | null;
  return (activeBtn?.dataset.mode as 'any' | 'all') || 'any';
}

// ============== OPEN/LOAD PANEL ==============

/**
 * Open edit panel for new or existing rule
 */
export function openEditPanel(ruleId: string | null = null): void {
  editingRuleId = ruleId;

  const title = document.getElementById('rule-panel-title');

  if (ruleId) {
    if (title) title.textContent = i18n.t('rules_edit');
    loadToEditPanel(ruleId);
  } else {
    if (title) title.textContent = i18n.t('rules_add');

    // Clear form
    const editRuleId = document.getElementById('edit-rule-id') as HTMLInputElement | null;
    const ruleName = document.getElementById('rule-name') as HTMLInputElement | null;
    const ruleKeywords = document.getElementById('rule-keywords') as HTMLTextAreaElement | null;
    const ruleSound = document.getElementById('rule-sound') as HTMLSelectElement | null;

    if (editRuleId) editRuleId.value = '';
    if (ruleName) ruleName.value = '';
    if (ruleKeywords) ruleKeywords.value = '';
    if (ruleSound) ruleSound.value = 'notification';

    // Reset components
    userChipInput?.clear();
    chatChipInput?.clear();
    colorPicker?.reset();
    setToggleValue('.match-mode-btn', 'mode', 'any');
  }

  openPanel('panel-rule-edit');

  setTimeout(() => {
    const ruleName = document.getElementById('rule-name') as HTMLInputElement | null;
    ruleName?.focus();
  }, FOCUS_DELAY);
}

/**
 * Load existing rule data into edit panel
 */
async function loadToEditPanel(ruleId: string): Promise<void> {
  const rule = await Storage.getRule(ruleId);
  if (!rule) return;

  const editRuleId = document.getElementById('edit-rule-id') as HTMLInputElement | null;
  const ruleName = document.getElementById('rule-name') as HTMLInputElement | null;
  const ruleSound = document.getElementById('rule-sound') as HTMLSelectElement | null;
  const ruleKeywords = document.getElementById('rule-keywords') as HTMLTextAreaElement | null;

  if (editRuleId) editRuleId.value = rule.id;
  if (ruleName) ruleName.value = rule.name;
  if (ruleSound) ruleSound.value = rule.sound || 'notification';

  // Extract data from conditions
  const keywordCondition = (rule.conditions || []).find(c => c.type === 'keyword');
  const userCondition = (rule.conditions || []).find(c => c.type === 'user');

  // Load keywords
  const keywords = keywordCondition ? keywordCondition.values : [];
  if (ruleKeywords) ruleKeywords.value = keywords.join('\n');

  // Load users via component
  if (userCondition && userCondition.values) {
    const users = userCondition.values.map(val => {
      const isId = /^\d+$/.test(String(val));
      return { id: isId ? String(val) : '', name: isId ? '' : String(val) };
    });
    userChipInput?.setItems(users);
  } else {
    userChipInput?.clear();
  }

  // Load chats via component
  const chats = (rule.chats || []).map(c => typeof c === 'string' ? c : c.name);
  chatChipInput?.setItems(chats);

  // Set color via component
  colorPicker?.setColor(rule.color || '#3390ec');
  setToggleValue('.match-mode-btn', 'mode', rule.matchMode || 'any');
}

// ============== SAVE ==============

async function save(): Promise<void> {
  const ruleNameInput = document.getElementById('rule-name') as HTMLInputElement | null;
  const ruleKeywordsInput = document.getElementById('rule-keywords') as HTMLTextAreaElement | null;

  const name = ruleNameInput?.value.trim() || '';
  const keywordsText = ruleKeywordsInput?.value || '';
  const color = colorPicker?.getColor() || '#3390ec';
  const sound = (document.getElementById('rule-sound') as HTMLSelectElement | null)?.value || 'notification';

  if (!name) {
    showToast(i18n.t('rules_enterName'), 'error');
    return;
  }

  const keywords = keywordsText
    .split('\n')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  // Get items from components
  const users = userChipInput?.getItems() || [];
  const chats = chatChipInput?.getItems() || [];

  // Build conditions
  const conditions: RuleCondition[] = [];

  if (keywords.length > 0) {
    conditions.push({ type: 'keyword', values: keywords });
  }

  if (users.length > 0) {
    const userValues = users.map(u => u.id || u.name);
    conditions.push({ type: 'user', values: userValues });
  }

  // Validate: at least one condition required
  if (conditions.length === 0) {
    showToast(i18n.t('rules_noKeywordsOrUsers'), 'error');
    return;
  }

  const ruleData = {
    name,
    conditions,
    matchMode: getMatchMode(),
    chats,
    color,
    sound
  };

  if (editingRuleId) {
    await Storage.updateRule(editingRuleId, ruleData);
    showToast(i18n.t('rules_updated'), 'success');
  } else {
    await Storage.addRule(ruleData);
    showToast(i18n.t('rules_added'), 'success');
  }

  closeAllPanels();
  await load();
}
