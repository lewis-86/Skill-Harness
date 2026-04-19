import { Rule, ValidationResult, Level, ParsedSkill, SkillFrontmatter, RuleCategory, QualityDimension, FixImpact } from '../core/types';

/**
 * Trigger phrase categories for AI understanding
 */
const TRIGGER_PATTERNS = {
  /** 经典 "Use when" 模式 - AI 最容易识别 */
  CLASSIC: ['use when', 'use this when', 'use this skill', 'use it to', 'use whenever'],
  /** 动作导向模式 - 强调执行能力 */
  ACTION: ['execute ', 'analyzes ', 'analyze ', 'delegate ', 'search,', 'extract ', 'query ', 'manage ', 'manage,', 'create ', 'creates ', 'create,', 'build ', 'build,', 'design ', 'design,', 'guide ', 'guide,', 'run ', 'run,', 'explore ', 'explore,', 'debug ', 'debug,', 'stage,', 'improve ', 'identify ', 'identify,', 'triage ', 'triage,', 'process ', 'process,', 'migrate ', 'fetch ', 'fetch,', 'edit ', 'transform ', 'integrate ', 'integrates ', 'automate ', 'automates '],
  /** 用途导向模式 - 强调使用场景 */
  USAGE: ['for when', 'for ', 'when the user', 'whenever the user', 'when you need', 'use the ', 'use a ', 'use these', 'use it'],
  /** 工具包模式 - 强调复用能力 */
  TOOLKIT: ['toolkit', 'suite', 'battle-tested', 'a set of', 'a skill ']
};

/**
 * Flatten all valid starts
 */
const VALID_STARTS = [
  ...TRIGGER_PATTERNS.CLASSIC,
  ...TRIGGER_PATTERNS.ACTION,
  ...TRIGGER_PATTERNS.USAGE,
  ...TRIGGER_PATTERNS.TOOLKIT,
  'execute autonomous', 'connect to ', 'access the ', 'provides ', 'audit ', 'assists ', 'applies ', 'download ', 'automatically ', 'creates ', 'creating ', 'picks ', 'intelligently ', 'you ', 'you must'
];

/**
 * Rule semantic-001: description-start
 * 检查 description 是否以有效触发短语开头
 *
 * Human-friendly: 好的描述让开发者快速理解skill用途
 * AI-friendly: AI通过description匹配用户意图，触发短语决定能否正确触发
 */
export class DescriptionStartRule implements Rule {
  readonly id = 'semantic-001';
  readonly name = 'description-start';
  readonly description = 'Ensures description starts with effective trigger phrases for AI matching';
  readonly category = RuleCategory.SEMANTIC;
  readonly dimensions = [QualityDimension.TRIGGERABILITY, QualityDimension.MAINTAINABILITY];
  readonly level = Level.HINT;
  readonly autoFixable = false;
  readonly fixImpact = FixImpact.MEDIUM;

  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult {
    if (frontmatter === null) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: '跳过检查: frontmatter 缺失'
      };
    }

    const description = frontmatter.description;

    if (description === undefined || description === null || typeof description !== 'string') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        passed: true,
        level: this.level,
        message: '跳过检查: description 字段无效'
      };
    }

    const lower = description.toLowerCase().trim();

    // Categorize matched pattern
    let matchedCategory = '';
    for (const [cat, patterns] of Object.entries(TRIGGER_PATTERNS)) {
      for (const pattern of patterns) {
        if (lower.startsWith(pattern)) {
          matchedCategory = cat;
          break;
        }
      }
      if (matchedCategory) break;
    }

    // Check against all valid starts
    for (const start of VALID_STARTS) {
      if (lower.startsWith(start)) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          passed: true,
          level: this.level,
          message: `Description 以有效触发短语开头 [${matchedCategory || 'ACTION'}]`
        };
      }
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      passed: false,
      level: this.level,
      message: 'Description 建议以 "Use when..." 或动作动词开头，提高 AI 触发匹配度',
      aiHint: {
        what: 'Description 开头不在有效触发短语列表中',
        why: 'AI 通过 description 匹配用户意图，触发短语影响 skill 是否被正确激活。无效开头会导致即使用户需求匹配也无法触发',
        how: '将 description 改为以 "Use when..."、"Execute..."、"Analyze..." 等有效模式开头',
        example: {
          bad: 'A skill for processing data with Claude Code',
          good: 'Use when you need to analyze code quality and provide suggestions'
        }
      },
      fixable: false,
      fixImpact: this.fixImpact
    };
  }
}

export const descriptionStartRule = new DescriptionStartRule();
