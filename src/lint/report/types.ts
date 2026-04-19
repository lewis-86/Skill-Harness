/**
 * Advanced Lint Report Types
 */

/**
 * Comprehensive skill report with diagnostics and recommendations
 */
export interface SkillLintReport {
  // Basic info
  skillPath: string;
  skillName: string | null;
  timestamp: string;

  // Health score (0-100)
  healthScore: number;
  grade: ReportGrade;

  // Issue summary
  summary: ReportSummary;

  // Detailed issues
  issues: SkillIssue[];

  // Skill insights
  insights: SkillInsight[];

  // Recommendations
  recommendations: Recommendation[];

  // Metadata
  metadata: ReportMetadata;
}

/**
 * Report grades
 */
export type ReportGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Summary statistics
 */
export interface ReportSummary {
  totalRules: number;
  passed: number;
  blockers: number;
  warnings: number;
  hints: number;
  coverage: number;       // Content coverage score
  triggerQuality: number; // Trigger phrase quality
  structureScore: number; // Structure quality
}

/**
 * AI hint for understanding and fixing issues
 */
export interface AIHint {
  what: string;       // 什么问题
  why: string;        // 为什么这是个问题
  how: string;        // 如何修复（通用指导）
  example?: {
    bad: string;      // 错误示例
    good: string;     // 正确示例
  };
}

/**
 * Skill issue with context
 */
export interface SkillIssue {
  ruleId: string;
  ruleName: string;
  severity: IssueSeverity;

  // What was found
  found: string;
  expected?: string;

  // Location
  location: IssueLocation;

  // Context
  context: string;        // The surrounding code/text
  snippet?: string;       // Code snippet if applicable

  // Auto-fix if available
  autoFixable: boolean;
  fixSuggestion?: string;

  // AI-friendly hints (Human & AI friendly design)
  aiHint?: AIHint;
}

/**
 * Issue severity levels
 */
export type IssueSeverity = 'blocker' | 'warning' | 'hint';

/**
 * Issue location
 */
export interface IssueLocation {
  line: number;
  column?: number;
  field?: string;         // e.g., "description", "name"
}

/**
 * Skill insight - positive observations
 */
export interface SkillInsight {
  type: InsightType;
  message: string;
  strength: number;       // 0-100 how strong this insight is
}

/**
 * Insight types
 */
export type InsightType =
  | 'good-trigger'
  | 'good-structure'
  | 'good-coverage'
  | 'best-practice'
  | 'positive-pattern';

/**
 * Recommendation for improvement
 */
export interface Recommendation {
  priority: RecommendationPriority;
  category: RecommendationCategory;

  // What to do
  action: string;
  reason: string;

  // How to do it
  steps: string[];
  example?: string;

  // Effort estimate
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

/**
 * Recommendation priority
 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Recommendation category
 */
export type RecommendationCategory =
  | 'description'
  | 'structure'
  | 'trigger'
  | 'content'
  | 'references'
  | 'style';

/**
 * Report metadata
 */
export interface ReportMetadata {
  linterVersion: string;
  rulesVersion: string;
  scanDuration: number;    // ms
  skillSize: number;      // lines
  skillComplexity: number; // complexity score
}

/**
 * Batch report for multiple skills
 */
export interface BatchLintReport {
  timestamp: string;
  totalSkills: number;
  summary: BatchSummary;

  // Skills breakdown
  byGrade: Record<ReportGrade, string[]>;  // grade -> skill names
  byIssue: Record<string, string[]>;       // ruleId -> skill names

  // Top issues
  topIssues: IssueFrequency[];

  // Top recommendations
  topRecommendations: RecommendationFrequency[];

  // Skills needing immediate attention
  criticalSkills: string[];

  // Overall health
  overallHealthScore: number;
}

/**
 * Batch summary
 */
export interface BatchSummary {
  averageHealthScore: number;
  averageGrade: ReportGrade;
  skillsByGrade: Record<ReportGrade, number>;
  totalIssues: number;
  autoFixable: number;
  qualityDimensions?: Record<string, number>;
}

/**
 * Issue frequency in batch
 */
export interface IssueFrequency {
  ruleId: string;
  ruleName: string;
  severity: IssueSeverity;
  count: number;
  affectedSkills: string[];
}

/**
 * Recommendation frequency in batch
 */
export interface RecommendationFrequency {
  category: RecommendationCategory;
  action: string;
  count: number;
  impact: 'low' | 'medium' | 'high';
}