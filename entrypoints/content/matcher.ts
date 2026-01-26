/**
 * Telegram Keyword Alert - Content Script: Rule Matcher
 * Modular condition-based matching system
 */

import {
  Storage as tkaStorage,
  type RuleCondition,
  type ChatFilter,
  type Rule,
  type Settings,
} from '@/utils/tka-storage';
import { logError, logDebug } from '@/utils/error-handling';

interface MatchContext {
  text: string;
  chatName: string | null;
  senderName: string | null;
  senderId: string | null;
}

interface ConditionMatchResult {
  type: string;
  matched: string | string[];
  matchedById?: boolean;
  matchedByName?: boolean;
}

export interface RuleMatchResult {
  ruleId: string;
  ruleName: string;
  color?: string;
  sound?: string;
  keywords: string[];
  username: string | null;
  matches: ConditionMatchResult[];
}

// ============== CACHE STATE ==============

export let cachedSettings: Settings | null = null;
export let cachedRules: Rule[] | null = null;

// ============== CONDITION MATCHERS ==============

type ConditionMatcher = (
  condition: RuleCondition,
  context: MatchContext
) => ConditionMatchResult | null;

/**
 * Condition Matchers - modular matching functions
 * Each matcher receives (condition, context) and returns match result or null
 */
const conditionMatchers: Record<string, ConditionMatcher> = {
  /**
   * Keyword condition matcher
   * Matches if any keyword is found in the message text
   */
  keyword: (condition, { text }) => {
    if (!condition.values || condition.values.length === 0 || !text)
      return null;

    const lowerText = text.toLowerCase();
    const matched = condition.values.filter(
      (k) => k && lowerText.includes(k.toLowerCase())
    );

    if (matched.length > 0) {
      return { type: 'keyword', matched };
    }
    return null;
  },

  /**
   * User condition matcher
   * Matches if sender matches any user in the list (by name or ID)
   */
  user: (condition, { senderName, senderId }) => {
    if (!condition.values || condition.values.length === 0) return null;

    for (const val of condition.values) {
      if (!val) continue;

      const value = String(val).trim();
      const isId = /^\d+$/.test(value);

      // Match by ID
      if (isId && senderId && senderId === value) {
        return { type: 'user', matched: value, matchedById: true };
      }

      // Match by name
      if (!isId && senderName) {
        const lowerValue = value.toLowerCase();
        const lowerSender = senderName.toLowerCase();
        if (
          lowerSender.includes(lowerValue) ||
          lowerValue.includes(lowerSender)
        ) {
          return { type: 'user', matched: value, matchedByName: true };
        }
      }
    }
    return null;
  },

  // Future matchers can be added here:
  // regex: (condition, context) => { ... }
  // time: (condition, context) => { ... }
};

// ============== CACHE FUNCTIONS ==============

/**
 * Refresh cached rules and settings from storage
 */
export async function refreshCache(): Promise<void> {
  try {
    cachedSettings = await tkaStorage.getSettings();
    cachedRules = await tkaStorage.getRules();
  } catch (e) {
    logError('Cache refresh', e);
  }
}

// ============== MATCHING FUNCTIONS ==============

/**
 * Check if chat matches rule's chat filter
 */
function chatMatchesRule(
  chatName: string | null,
  ruleChats?: (string | ChatFilter)[]
): boolean {
  if (!ruleChats || ruleChats.length === 0) {
    return true;
  }
  if (!chatName) return false;

  const lowerChatName = chatName.toLowerCase();
  return ruleChats.some((chat) => {
    const chatFilter = (
      typeof chat === 'string' ? chat : chat.name || ''
    ).toLowerCase();
    return (
      lowerChatName.includes(chatFilter) || chatFilter.includes(lowerChatName)
    );
  });
}

/**
 * Match message against all rules
 * Uses modular condition matchers with AND/OR logic
 */
export function matchRules(
  text: string,
  chatName: string | null,
  senderName: string | null,
  senderId: string | null
): RuleMatchResult | null {
  if (!cachedRules || cachedRules.length === 0) {
    return null;
  }

  logDebug('Matcher', 'Checking rules for:', text?.substring(0, 50) + (text && text.length > 50 ? '...' : ''));

  const context: MatchContext = { text, chatName, senderName, senderId };

  for (const rule of cachedRules) {
    if (!rule.enabled) continue;
    if (!chatMatchesRule(chatName, rule.chats)) continue;

    // Skip rules without conditions
    if (!rule.conditions || rule.conditions.length === 0) continue;

    const results: ConditionMatchResult[] = [];

    // Check each condition
    for (const condition of rule.conditions) {
      const matcher = conditionMatchers[condition.type];
      if (matcher) {
        const result = matcher(condition, context);
        if (result) {
          results.push(result);
        }
      }
    }

    // Determine if rule matches based on matchMode
    const matchMode = rule.matchMode || 'any';
    const allMatch = results.length === rule.conditions.length;
    const anyMatch = results.length > 0;
    const isMatch = matchMode === 'all' ? allMatch : anyMatch;

    if (isMatch) {
      // Build match info for notification
      const keywordMatches = results
        .filter((r) => r.type === 'keyword')
        .flatMap((r) => (Array.isArray(r.matched) ? r.matched : [r.matched]));
      const userMatch = results.find((r) => r.type === 'user');

      logDebug('Matcher', 'Rule matched:', rule.name, '| matches:', results.length, '| mode:', matchMode);

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        color: rule.color,
        sound: rule.sound,
        keywords: keywordMatches,
        username: userMatch
          ? typeof userMatch.matched === 'string'
            ? userMatch.matched
            : userMatch.matched[0]
          : null,
        matches: results,
      };
    }
  }

  return null;
}
