import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

/**
 * Rule struct-001: frontmatter-required
 * Checks if the SKILL.md file has a valid YAML frontmatter block
 */
export class FrontmatterRequiredRule implements Rule {
  readonly id = 'struct-001';
  readonly name = 'frontmatter-required';
  readonly description = 'Ensures SKILL.md has a valid YAML frontmatter block';
  readonly level = Level.BLOCKER;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    // Check if frontmatter exists
    if (!skill.hasFrontmatter) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Missing frontmatter: file must start with ---',
        position: { line: 1 }
      };
    }

    // Check if frontmatter is properly closed
    if (skill.frontmatterEndLine === -1) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Incomplete frontmatter: missing closing ---',
        position: { line: skill.frontmatterStartLine + 1 }
      };
    }

    // Check if frontmatter is empty
    if (skill.frontmatterRaw.trim() === '') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'Empty frontmatter: must contain at least name and description',
        position: { line: skill.frontmatterStartLine + 1 }
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'Frontmatter present and valid'
    };
  }
}

export const frontmatterRequiredRule = new FrontmatterRequiredRule();
