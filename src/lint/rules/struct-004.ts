import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

/**
 * Rule struct-004: name-format
 * Checks if name field follows kebab-case convention
 */
export class NameFormatRule implements Rule {
  readonly id = 'struct-004';
  readonly name = 'name-format';
  readonly description = 'Ensures name field follows kebab-case convention';
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

    // Check pattern: must start with lowercase letter, only lowercase letters, numbers, hyphens
    const pattern = /^[a-z][a-z0-9-]*$/;

    if (!pattern.test(name)) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Invalid name format: must be lowercase with hyphens only (kebab-case)',
        field: 'name'
      };
    }

    // Cannot end with hyphen
    if (name.endsWith('-')) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Invalid name format: cannot end with hyphen',
        field: 'name'
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'Name format is valid'
    };
  }
}

export const nameFormatRule = new NameFormatRule();
