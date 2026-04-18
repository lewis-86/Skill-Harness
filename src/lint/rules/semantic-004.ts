import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

const PLACEHOLDER_PATTERNS = [
  /\btbd\b/i,
  /\btodo\b/i,
  /\bfixme\b/i,
  /\[.*\]/,           // [xxx]
  /\(insert.*\)/i,
  /\(add.*\)/i,
];

/**
 * Rule semantic-004: description-no-placeholder
 * Checks if description does not contain placeholder text
 */
export class DescriptionNoPlaceholderRule implements Rule {
  readonly id = 'semantic-004';
  readonly name = 'description-no-placeholder';
  readonly description = 'Ensures description does not contain placeholder text';
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

    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(description)) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          passed: false,
          level: this.level,
          message: 'Description contains placeholder text (TBD, TODO, [xxx], etc.)'
        };
      }
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'Description does not contain placeholders'
    };
  }
}

export const descriptionNoPlaceholderRule = new DescriptionNoPlaceholderRule();
