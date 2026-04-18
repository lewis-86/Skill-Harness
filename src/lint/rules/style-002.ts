import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

/**
 * Rule style-002: no-trailing-whitespace
 * 检查是否存在行尾空格
 */
export class NoTrailingWhitespaceRule implements Rule {
  readonly id = 'style-002';
  readonly name = 'no-trailing-whitespace';
  readonly description = 'Ensures no trailing whitespace at end of lines';
  readonly level = Level.HINT;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    const content = skill.content;
    const lines = content.split('\n');

    const issues: { line: number; spaces: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\s+$/);
      if (match) {
        issues.push({ line: i + 1, spaces: match[0] });
      }
    }

    if (issues.length > 0) {
      const lineList = issues.slice(0, 5).map(i => `第 ${i.line} 行`).join(', ');
      const more = issues.length > 5 ? ` 等共 ${issues.length} 处` : '';
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `存在行尾空格: ${lineList}${more}`
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: '无行尾空格'
    };
  }
}

export const noTrailingWhitespaceRule = new NoTrailingWhitespaceRule();
