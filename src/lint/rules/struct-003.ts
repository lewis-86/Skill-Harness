import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

/**
 * Rule struct-003: description-required
 * Checks if frontmatter contains a non-empty description field
 */
export class DescriptionRequiredRule implements Rule {
  readonly id = 'struct-003';
  readonly name = 'description-required';
  readonly description = 'Ensures frontmatter contains a non-empty description field';
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

    const description = frontmatter.description;

    // Check if description field exists
    if (description === undefined || description === null) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Missing required field: description',
        field: 'description'
      };
    }

    // Check if description is a string
    if (typeof description !== 'string') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Invalid description: must be a string',
        field: 'description'
      };
    }

    // Check if description is empty
    if (description.trim() === '') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Invalid description: cannot be empty',
        field: 'description'
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'Description field present and valid'
    };
  }
}

export const descriptionRequiredRule = new DescriptionRequiredRule();
