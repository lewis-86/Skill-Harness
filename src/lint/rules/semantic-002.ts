import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

const WORKFLOW_PATTERNS = [
  /\bstep\s+\d+/i,           // step 1, step 2
  /\bfirst,?\s+(you\s+)?\w+\s+\w+/i,  // first you do X, first do X
  /\bthen,?\s+(you\s+)?\w+\s+\w+/i,   // then you do X, then do X
  /\bnext,?\s+(you\s+)?\w+\s+\w+/i,   // next you do X
];

/**
 * Rule semantic-002: description-workflow
 * Checks if description does not summarize workflow steps
 */
export class DescriptionWorkflowRule implements Rule {
  readonly id = 'semantic-002';
  readonly name = 'description-workflow';
  readonly description = 'Ensures description does not summarize workflow steps';
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

    for (const pattern of WORKFLOW_PATTERNS) {
      if (pattern.test(description)) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          passed: false,
          level: this.level,
          message: 'Description should not summarize workflow steps; put workflow in SKILL.md body'
        };
      }
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'Description does not contain workflow summaries'
    };
  }
}

export const descriptionWorkflowRule = new DescriptionWorkflowRule();
