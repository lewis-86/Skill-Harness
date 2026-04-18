import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

const MIN_LENGTH = 10;
const TRIGGER_PHRASES = [
  'when ',
  'whenever ',
  'if the user',
  'if you need',
  'for ',
  'in case of',
  'upon '
];

/**
 * Rule semantic-003: description-trigger
 * Checks if description contains trigger conditions
 */
export class DescriptionTriggerRule implements Rule {
  readonly id = 'semantic-003';
  readonly name = 'description-trigger';
  readonly description = 'Ensures description contains trigger conditions';
  readonly level = Level.WARNING;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    if (frontmatter === null) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: 'Skipped: frontmatter is missing'
      };
    }

    const description = frontmatter.description;

    if (description === undefined || description === null || typeof description !== 'string') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: 'Skipped: description field is not a valid string'
      };
    }

    // Check minimum length
    if (description.length < MIN_LENGTH) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `Description too short (${description.length}/${MIN_LENGTH}) - must contain trigger conditions`
      };
    }

    // Check for trigger phrases
    const lower = description.toLowerCase();
    for (const phrase of TRIGGER_PHRASES) {
      if (lower.includes(phrase)) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          passed: true,
          level: this.level,
          message: 'Description contains valid trigger phrase'
        };
      }
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: false,
      level: this.level,
      message: 'Description must contain trigger conditions (e.g., "when", "if", "for")'
    };
  }
}

export const descriptionTriggerRule = new DescriptionTriggerRule();
