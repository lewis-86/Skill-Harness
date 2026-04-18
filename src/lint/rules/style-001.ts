import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter } from '../core/types';

/**
 * Rule style-001: code-blocks-have-language
 * 检查代码块是否指定了语言标识符
 */
export class CodeBlocksHaveLanguageRule implements Rule {
  readonly id = 'style-001';
  readonly name = 'code-blocks-have-language';
  readonly description = 'Ensures code blocks specify a language for syntax highlighting';
  readonly level = Level.HINT;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    const content = skill.content;
    const lines = content.split('\n');

    const missingLangLines: number[] = [];
    let insideCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 遇到代码块开始/结束标记
      if (line.startsWith('```')) {
        if (!insideCodeBlock) {
          // 这是开代码块
          insideCodeBlock = true;
          // 检查是否有语言标识符
          // 开代码块格式: ```javascript (有语言), ``` (无语言)
          const match = line.match(/^```(\w+)$/);
          if (!match) {
            // 没有有效的语言标识符
            missingLangLines.push(i + 1);
          }
        } else {
          // 这是闭代码块
          insideCodeBlock = false;
        }
      }
    }

    if (missingLangLines.length > 0) {
      const lineList = missingLangLines.slice(0, 5).map(l => `第 ${l} 行`).join(', ');
      const more = missingLangLines.length > 5 ? ` 等共 ${missingLangLines.length} 处` : '';
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: false,
        level: this.level,
        message: `代码块缺少语言标识符: ${lineList}${more}`
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: true,
      level: this.level,
      message: '所有代码块都指定了语言标识符'
    };
  }
}

export const codeBlocksHaveLanguageRule = new CodeBlocksHaveLanguageRule();
