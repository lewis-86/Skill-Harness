import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

const MAX_DESCRIPTION_LENGTH = 1024;

/**
 * Rule struct-006: description-length
 * Checks if description field does not exceed maximum length
 */
export class DescriptionLengthRule implements Rule {
  readonly id = 'struct-006';
  readonly name = 'description-length';
  readonly description = 'Ensures description field does not exceed maximum length';
  readonly level = Level.HINT;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    // Cannot check if frontmatter doesn't exist
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

    // Cannot check if description doesn't exist - struct-003 handles this
    if (description === undefined || description === null || typeof description !== 'string') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: 'Skipped: description field is not a valid string'
      };
    }

    // Check length
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `Invalid description: exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`,
        field: 'description'
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: `Description length is valid (${description.length}/${MAX_DESCRIPTION_LENGTH})`
    };
  }
}

export const descriptionLengthRule = new DescriptionLengthRule();
