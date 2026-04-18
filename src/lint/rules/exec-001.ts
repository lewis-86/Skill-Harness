import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Rule exec-001: reference-accessible
 * Checks if referenced files are accessible
 */
export class ReferenceAccessibleRule implements Rule {
  readonly id = 'exec-001';
  readonly name = 'reference-accessible';
  readonly description = 'Ensures referenced files and paths are accessible';
  readonly level = Level.WARNING;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    const skillDir = path.dirname(skill.frontmatterStartLine > 0 ? '' : '');

    // Extract markdown links and relative paths from content
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const relativePathPattern = /\.\.\/[\w-]+/g;
    const scriptPathPattern = /\.\/[\w-]+/g;

    const content = skill.content;
    const issues: string[] = [];

    let match;

    // Check markdown links
    while ((match = linkPattern.exec(content)) !== null) {
      const linkPath = match[1];
      if (this.isRelativePath(linkPath)) {
        const fullPath = path.join(skillDir, linkPath);
        if (!this.pathExists(fullPath)) {
          issues.push(linkPath);
        }
      }
    }

    // Check relative paths
    while ((match = relativePathPattern.exec(content)) !== null) {
      const relPath = match[0];
      const fullPath = path.join(skillDir, relPath);
      if (!this.pathExists(fullPath)) {
        issues.push(relPath);
      }
    }

    // Check script paths
    while ((match = scriptPathPattern.exec(content)) !== null) {
      const scriptPath = match[0];
      const fullPath = path.join(skillDir, scriptPath);
      if (!this.pathExists(fullPath)) {
        issues.push(scriptPath);
      }
    }

    if (issues.length > 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `Inaccessible references: ${issues.join(', ')}`
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: 'All references are accessible'
    };
  }

  private isRelativePath(linkPath: string): boolean {
    return linkPath.startsWith('../') || linkPath.startsWith('./') || !linkPath.includes('://');
  }

  private pathExists(p: string): boolean {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }
}

export const referenceAccessibleRule = new ReferenceAccessibleRule();
