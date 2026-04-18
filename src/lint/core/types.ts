/**
 * Validation severity levels
 */
export enum Level {
  BLOCKER = 'BLOCKER',
  WARNING = 'WARNING',
  HINT = 'HINT'
}

/**
 * Validation result for a single rule
 */
export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  level: Level;
  message: string;
  field?: string;
  position?: {
    line: number;
    column?: number;
  };
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
 * Rule interface
 */
export interface Rule {
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
