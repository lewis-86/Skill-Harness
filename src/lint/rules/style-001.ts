import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter, RuleCategory, QualityDimension, FixImpact } from '../core/types';

/**
 * Rule style-001: code-blocks-have-language
 * 检查代码块是否指定了语言标识符
 *
 * Human-friendly: 帮助人类开发者获得更好的代码高亮显示
 * AI-friendly: AI 可以自动检测并修复，检测模式简单明确
 */
export class CodeBlocksHaveLanguageRule implements Rule {
  readonly id = 'style-001';
  readonly name = 'code-blocks-have-language';
  readonly description = 'Ensures code blocks specify a language for syntax highlighting';
  readonly category = RuleCategory.STYLE;
  readonly dimensions = [QualityDimension.MAINTAINABILITY];
  readonly level = Level.HINT;
  readonly autoFixable = true;
  readonly fixImpact = FixImpact.LOW;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    const content = skill.content;
    const lines = content.split('\n');

    const missingLangLines: number[] = [];
    let insideCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('```')) {
        if (!insideCodeBlock) {
          insideCodeBlock = true;
          const match = line.match(/^```(\w+)$/);
          if (!match) {
            missingLangLines.push(i + 1);
          }
        } else {
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
        message: `代码块缺少语言标识符: ${lineList}${more}`,
        aiHint: {
          what: `有 ${missingLangLines.length} 个代码块未指定语言标识符`,
          why: '没有语言标识符，代码高亮不生效，影响可读性；AI 也难以判断代码类型',
          how: '在 ``` 后添加语言标识符，如 ```javascript、```python、```bash',
          example: {
            bad: '```\nconsole.log("hello")\n```',
            good: '```javascript\nconsole.log("hello")\n```'
          }
        },
        fixable: true,
        fixImpact: this.fixImpact,
        position: { line: missingLangLines[0] }
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
