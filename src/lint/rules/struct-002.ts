import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

/**
 * Rule struct-002: name-required
 * Checks if frontmatter contains a non-empty name field
 */
export class NameRequiredRule implements Rule {
  readonly id = 'struct-002';
  readonly name = 'name-required';
  readonly description = 'Ensures frontmatter contains a non-empty name field';
  readonly level = Level.BLOCKER;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    // Cannot check if frontmatter doesn't exist - struct-001 should catch this
    if (frontmatter === null) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Cannot validate: frontmatter is missing',
        position: { line: 1 }
      };
    }

    const name = frontmatter.name;

    // Check if name field exists
    if (name === undefined || name === null) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Missing required field: name',
        field: 'name'
      };
    }

    // Check if name is a string
    if (typeof name !== 'string') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Invalid name: must be a string',
        field: 'name'
      };
    }

    // Check if name is empty
    if (name.trim() === '') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Invalid name: cannot be empty',
        field: 'name'
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'Name field present and valid'
    };
  }
}

export const nameRequiredRule = new NameRequiredRule();
