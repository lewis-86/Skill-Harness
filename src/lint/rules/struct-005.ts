import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

const MAX_NAME_LENGTH = 64;

/**
 * Rule struct-005: name-length
 * Checks if name field does not exceed maximum length
 */
export class NameLengthRule implements Rule {
  readonly id = 'struct-005';
  readonly name = 'name-length';
  readonly description = 'Ensures name field does not exceed maximum length';
  readonly level = Level.WARNING;

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

    const name = frontmatter.name;

    // Cannot check if name doesn't exist - struct-002 handles this
    if (name === undefined || name === null || typeof name !== 'string') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: 'Skipped: name field is not a valid string'
      };
    }

    // Check length
    if (name.length > MAX_NAME_LENGTH) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `Invalid name: exceeds maximum length of ${MAX_NAME_LENGTH} characters`,
        field: 'name'
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: `Name length is valid (${name.length}/${MAX_NAME_LENGTH})`
    };
  }
}

export const nameLengthRule = new NameLengthRule();
