import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

const VALID_STARTS = [
  'use when',
  'use this when',
  'use this skill',
  'use the ',
  'use a ',
  'use these',
  'use it',
  'use it to',
  'when the user',
  'whenever the user',
  'when you need',
  'for ',
];

/**
 * Rule semantic-001: description-start
 * Checks if description starts with "Use when..." for optimal triggering
 */
export class DescriptionStartRule implements Rule {
  readonly id = 'semantic-001';
  readonly name = 'description-start';
  readonly description = 'Ensures description starts with "Use when..." for optimal triggering';
  readonly level = Level.HINT;

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

    const lower = description.toLowerCase().trim();

    for (const start of VALID_STARTS) {
      if (lower.startsWith(start)) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          passed: true,
          level: this.level,
          message: 'Description starts with valid trigger phrase'
        };
      }
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: false,
      level: this.level,
      message: 'Description should start with "Use when..." for optimal triggering'
    };
  }
}

export const descriptionStartRule = new DescriptionStartRule();
