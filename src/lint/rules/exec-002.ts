import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Rule exec-002: script-path-valid
 * Checks if scripts/ directory and paths are valid
 */
export class ScriptPathValidRule implements Rule {
  readonly id = 'exec-002';
  readonly name = 'script-path-valid';
  readonly description = 'Ensures scripts/ directory and paths are valid';
  readonly level = Level.WARNING;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    // Extract script references from content
    const scriptPattern = /scripts\/[\w-]+\.\w+/g;
    const content = skill.content;

    const scriptRefs: string[] = [];
    let match;

    while ((match = scriptPattern.exec(content)) !== null) {
      scriptRefs.push(match[0]);
    }

    // If no script references, skip validation
    if (scriptRefs.length === 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: 'Skipped: no script references found'
      };
    }

    // Get skill directory from path
    const skillDir = this.getSkillDirectory(skill.skillPath || '');

    // Check if scripts directory exists
    const scriptsDir = path.join(skillDir, 'scripts');
    if (!fs.existsSync(scriptsDir) || !fs.statSync(scriptsDir).isDirectory()) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: 'scripts/ directory is missing'
      };
    }

    // Check each script reference
    const issues: string[] = [];
    for (const scriptRef of scriptRefs) {
      const scriptPath = path.join(skillDir, scriptRef);
      if (!fs.existsSync(scriptPath)) {
        issues.push(scriptRef);
      }
    }

    if (issues.length > 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `Invalid script paths: ${issues.join(', ')}`
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'All script paths are valid'
    };
  }

  private getSkillDirectory(skillPath: string): string {
    if (skillPath.endsWith('SKILL.md')) {
      return path.dirname(skillPath);
    }
    return skillPath;
  }
}

export const scriptPathValidRule = new ScriptPathValidRule();
