/**
 * Validation severity levels
 */
export enum Level {
  BLOCKER = 'BLOCKER',
  WARNING = 'WARNING',
  HINT = 'HINT'
}

/**
 * Rule category - helps AI understand rule purpose
 */
export enum RuleCategory {
  STRUCTURE = 'structure',    // 文件结构相关
  SEMANTIC = 'semantic',      // 语义/触发相关
  EXECUTION = 'execution',    // 执行能力相关
  STYLE = 'style'             // 代码风格相关
}

/**
 * Quality dimension - AI reasoning dimension
 */
export enum QualityDimension {
  CORRECTNESS = 'correctness',      // 正确性 - skill能否正确执行
  TRIGGERABILITY = 'triggerability', // 可触发性 - AI能否正确识别触发时机
  MAINTAINABILITY = 'maintainability', // 可维护性 - 人类是否容易理解和修改
  PERFORMANCE = 'performance',      // 性能 - 执行效率和资源消耗
  REUSABILITY = 'reusability'       // 可复用性 - 能否被其他skill复用
}

/**
 * Fix impact level
 */
export enum FixImpact {
  LOW = 'low',      // 容易修复，如添加语言标识符
  MEDIUM = 'medium', // 需要一定思考，如重写description
  HIGH = 'high'      // 需要重构，如改变整体结构
}

/**
 * Validation result for a single rule
 */
export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  level: Level;
  /** Human-friendly message (中文) */
  message: string;
  /** AI-friendly structured data */
  aiHint?: {
    what: string;       // 什么问题
    why: string;        // 为什么这是个问题
    how: string;        // 如何修复（通用指导）
    example?: {
      bad: string;      // 错误示例
      good: string;     // 正确示例
    };
  };
  field?: string;
  position?: {
    line: number;
    column?: number;
  };
  fixable?: boolean;
  fixImpact?: FixImpact;
}

/**
 * Complete lint report for a skill
 */
export interface LintReport {
  skillPath: string;
  skillName: string | null;
  overallPassed: boolean;
  blockers: ValidationResult[];
  warnings: ValidationResult[];
  hints: ValidationResult[];
  timestamp: string;
}

/**
 * Skill frontmatter metadata
 */
export interface SkillFrontmatter {
  name?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Parsed skill content
 */
export interface ParsedSkill {
  frontmatter: SkillFrontmatter | null;
  frontmatterRaw: string;
  content: string;
  hasFrontmatter: boolean;
  frontmatterStartLine: number;
  frontmatterEndLine: number;
  skillPath?: string;
}

/**
 * Enhanced Rule interface - Human & AI friendly
 * All fields except validate are optional for backward compatibility
 */
export interface Rule {
  id: string;
  name: string;
  description: string;
  /** Rule category for AI classification */
  category?: RuleCategory;
  /** Quality dimensions this rule affects */
  dimensions?: QualityDimension[];
  level: Level;
  /** Whether this rule can be auto-fixed */
  autoFixable?: boolean;
  /** Impact level of fixing this issue */
  fixImpact?: FixImpact;
  /**
   * Validate skill and return result
   */
  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult;
}

/**
 * Legacy Rule interface (for compatibility)
 */
export interface LegacyRule {
  id: string;
  name: string;
  description: string;
  level: Level;
  validate(skill: ParsedSkill, frontmatter: SkillFrontmatter | null): ValidationResult;
}

/**
 * Rule configuration from YAML
 */
export interface RuleConfig {
  id: string;
  name: string;
  description: string;
  validation: {
    dimension: string;
    level: string;
    phase: string;
  };
  requires?: string[];
  detection: {
    type: string;
    [key: string]: any;
  };
  error_messages: Record<string, string>;
}
