import { Rule } from './types';
import { frontmatterRequiredRule } from '../rules/struct-001';
import { nameRequiredRule } from '../rules/struct-002';
import { descriptionRequiredRule } from '../rules/struct-003';
import { nameFormatRule } from '../rules/struct-004';
import { nameLengthRule } from '../rules/struct-005';
import { descriptionLengthRule } from '../rules/struct-006';
import { descriptionStartRule } from '../rules/semantic-001';
import { descriptionWorkflowRule } from '../rules/semantic-002';
import { descriptionTriggerRule } from '../rules/semantic-003';
import { descriptionNoPlaceholderRule } from '../rules/semantic-004';
import { referenceAccessibleRule } from '../rules/exec-001';
import { scriptPathValidRule } from '../rules/exec-002';
import { skillNameConsistentRule } from '../rules/exec-003';
import { codeBlocksHaveLanguageRule } from '../rules/style-001';
import { noTrailingWhitespaceRule } from '../rules/style-002';
import { consistentListMarkersRule } from '../rules/style-003';

/**
 * Registry of all available rules
 */
export const rulesRegistry = new Map<string, Rule>([
  [frontmatterRequiredRule.id, frontmatterRequiredRule],
  [nameRequiredRule.id, nameRequiredRule],
  [descriptionRequiredRule.id, descriptionRequiredRule],
  [nameFormatRule.id, nameFormatRule],
  [nameLengthRule.id, nameLengthRule],
  [descriptionLengthRule.id, descriptionLengthRule],
  [descriptionStartRule.id, descriptionStartRule],
  [descriptionWorkflowRule.id, descriptionWorkflowRule],
  [descriptionTriggerRule.id, descriptionTriggerRule],
  [descriptionNoPlaceholderRule.id, descriptionNoPlaceholderRule],
  [referenceAccessibleRule.id, referenceAccessibleRule],
  [scriptPathValidRule.id, scriptPathValidRule],
  [skillNameConsistentRule.id, skillNameConsistentRule],
  [codeBlocksHaveLanguageRule.id, codeBlocksHaveLanguageRule],
  [noTrailingWhitespaceRule.id, noTrailingWhitespaceRule],
  [consistentListMarkersRule.id, consistentListMarkersRule]
]);

/**
 * Get all rules
 */
export function getAllRules(): Rule[] {
  return Array.from(rulesRegistry.values());
}

/**
 * Get rule by ID
 */
export function getRule(id: string): Rule | undefined {
  return rulesRegistry.get(id);
}

/**
 * Get rules by phase (e.g., 'MVP')
 */
export function getRulesByPhase(phase: string): Rule[] {
  // TODO: Load phase from rule config
  // For MVP, return all MVP rules
  return getAllRules();
}
