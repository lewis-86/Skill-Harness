import { Rule } from '../lint/core/types';
import { rulesRegistry } from '../lint/core/registry';
import { RulesConfig } from './types';

/**
 * Rule filter based on config
 */
export class RuleFilter {
  /**
   * Filter rules based on config
   */
  filter(rules: Rule[], config: RulesConfig): Rule[] {
    // If all groups enabled and no disabled, return all
    if (this.allGroupsEnabled(config) && config.disabled.length === 0) {
      return rules;
    }

    const enabledRules = new Set<string>();

    // Process enabled patterns
    for (const pattern of config.enabled) {
      const matchingRules = this.findMatchingRules(pattern);
      for (const rule of matchingRules) {
        enabledRules.add(rule.id);
      }
    }

    // Remove disabled rules
    for (const pattern of config.disabled) {
      const matchingRules = this.findMatchingRules(pattern);
      for (const rule of matchingRules) {
        enabledRules.delete(rule.id);
      }
    }

    // Return filtered rules
    return rules.filter(rule => enabledRules.has(rule.id));
  }

  /**
   * Check if all rule groups are enabled
   */
  private allGroupsEnabled(config: RulesConfig): boolean {
    return config.enabled.includes('struct-*') &&
           config.enabled.includes('semantic-*') &&
           config.enabled.includes('exec-*') &&
           config.enabled.includes('style-*');
  }

  /**
   * Find rules matching a pattern
   */
  private findMatchingRules(pattern: string): Rule[] {
    // Wildcard pattern (e.g., "struct-*")
    if (pattern.endsWith('-*')) {
      const prefix = pattern.slice(0, -2);
      const allRules = Array.from(rulesRegistry.values());
      return allRules.filter(rule => rule.id.startsWith(`${prefix}-`));
    }

    // Exact match
    const rule = rulesRegistry.get(pattern);
    return rule ? [rule] : [];
  }

  /**
   * Get all available rule IDs
   */
  static getAllRuleIds(): string[] {
    return Array.from(rulesRegistry.keys());
  }

  /**
   * Get rule groups
   */
  static getRuleGroups(): Record<string, string[]> {
    return {
      'struct': Array.from(rulesRegistry.keys()).filter(id => id.startsWith('struct-')),
      'semantic': Array.from(rulesRegistry.keys()).filter(id => id.startsWith('semantic-')),
      'exec': Array.from(rulesRegistry.keys()).filter(id => id.startsWith('exec-')),
      'style': Array.from(rulesRegistry.keys()).filter(id => id.startsWith('style-'))
    };
  }
}

export const ruleFilter = new RuleFilter();