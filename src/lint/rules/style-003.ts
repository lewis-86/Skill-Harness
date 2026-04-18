import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

/**
 * Rule style-003: consistent-list-markers
 * 检查列表标记是否一致（统一使用 - 或 *）
 */
export class ConsistentListMarkersRule implements Rule {
  readonly id = 'style-003';
  readonly name = 'consistent-list-markers';
  readonly description = 'Ensures consistent use of list markers (- or *)';
  readonly level = Level.HINT;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    const content = skill.content;
    const lines = content.split('\n');

    const markers = new Set<string>();

    for (const line of lines) {
      // 匹配列表项: 可选的缩进后跟 - 或 *，再跟空格
      const match = line.match(/^[\s]*([-*])\s/);
      if (match) {
        markers.add(match[1]);
      }
    }

    // 如果只使用了一种标记，或者没有使用列表，则通过
    if (markers.size <= 1) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: '列表标记使用一致'
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: false,
      level: this.level,
      message: `列表标记不一致: 同时使用了 ${Array.from(markers).join(' 和 ')}`
    };
  }
}

export const consistentListMarkersRule = new ConsistentListMarkersRule();
