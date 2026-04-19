import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter, RuleCategory, QualityDimension, FixImpact } from '../core/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Rule exec-001: reference-accessible
 * 检查引用的文件路径是否可访问
 *
 * Human-friendly: 避免开发者点击链接后发现文件不存在
 * AI-friendly: AI 执行 skill 时会依赖这些引用，缺失会导致执行失败
 */
export class ReferenceAccessibleRule implements Rule {
  readonly id = 'exec-001';
  readonly name = 'reference-accessible';
  readonly description = 'Ensures referenced files and paths are accessible';
  readonly category = RuleCategory.EXECUTION;
  readonly dimensions = [QualityDimension.CORRECTNESS];
  readonly level = Level.WARNING;
  readonly autoFixable = false;
  readonly fixImpact = FixImpact.HIGH;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    const skillDir = path.dirname(skill.skillPath || '.');

    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const relativePathPattern = /\.\.\/[\w-]+/g;
    const scriptPathPattern = /\.\/[\w-]+/g;

    const content = skill.content;
    const issues: string[] = [];
    const issueTypes = { broken: 0, script: 0, data: 0 };

    let match;

    // Check markdown links
    while ((match = linkPattern.exec(content)) !== null) {
      const linkPath = match[2];
      if (this.isRelativePath(linkPath)) {
        const fullPath = path.join(skillDir, linkPath);
        if (!this.pathExists(fullPath)) {
          issues.push(linkPath);
          issueTypes.broken++;
        }
      }
    }

    // Check relative paths
    while ((match = relativePathPattern.exec(content)) !== null) {
      const relPath = match[0];
      const fullPath = path.join(skillDir, relPath);
      if (!this.pathExists(fullPath)) {
        issues.push(relPath);
        issueTypes.broken++;
      }
    }

    // Check script paths
    while ((match = scriptPathPattern.exec(content)) !== null) {
      const scriptPath = match[0];
      const fullPath = path.join(skillDir, scriptPath);
      if (!this.pathExists(fullPath)) {
        issues.push(scriptPath);
        issueTypes.script++;
      }
    }

    if (issues.length > 0) {
      const issueSummary = [];
      if (issueTypes.broken > 0) issueSummary.push(`${issueTypes.broken} 个链接`);
      if (issueTypes.script > 0) issueSummary.push(`${issueTypes.script} 个脚本`);
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `引用文件不可访问: ${issueSummary.join(', ')}`,
        aiHint: {
          what: `有 ${issues.length} 个引用路径指向不存在的文件`,
          why: 'Skill 执行时 AI 会依赖这些引用，缺失的文件会导致执行失败或降级处理',
          how: '1) 如果文件存在但路径错误，修正路径；2) 如果文件已被删除，移除引用；3) 如果是相对路径，确保路径相对于 skill 文件位置正确',
          example: {
            bad: '[下载脚本](../scripts/download.sh) - 文件可能不存在',
            good: '[下载脚本](./scripts/download.sh) - 确认文件存在且路径正确'
          }
        },
        fixable: false,
        fixImpact: this.fixImpact
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: '所有引用都可访问'
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
