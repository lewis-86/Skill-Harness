import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';
import * as path from 'path';

/**
 * Rule exec-003: skill-name-consistent
 * Checks if directory name matches the skill name in frontmatter
 */
export class SkillNameConsistentRule implements Rule {
  readonly id = 'exec-003';
  readonly name = 'skill-name-consistent';
  readonly description = 'Ensures directory name matches the skill name in frontmatter';
  readonly level = Level.HINT;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    // Skip if no frontmatter or no name field
    if (!frontmatter || !frontmatter.name) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: 'Skipped: no frontmatter name to compare'
      };
    }

    // Get directory name from skill path
    const skillDir = this.getSkillDirectory(skill.skillPath || '');
    const dirName = path.basename(skillDir);

    // Normalize both for comparison (lowercase, replace spaces/dashes)
    const normalizedDirName = this.normalizeName(dirName);
    const normalizedFrontmatterName = this.normalizeName(frontmatter.name);

    if (normalizedDirName !== normalizedFrontmatterName) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `Directory name '${dirName}' does not match skill name '${frontmatter.name}'`
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'Directory name matches skill name'
    };
  }

  private getSkillDirectory(skillPath: string): string {
    if (skillPath.endsWith('SKILL.md')) {
      return path.dirname(skillPath);
    }
    return skillPath;
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/[\s_-]+/g, '-');
  }
}

export const skillNameConsistentRule = new SkillNameConsistentRule();
