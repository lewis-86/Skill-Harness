/**
 * Profile result for a skill
 */
export interface ProfileResult {
  skillPath: string;
  skillName: string | null;
  timestamp: string;
  metrics: SkillMetrics;
  qualityGrade: SkillGrade;
  recommendations: string[];
  details: ProfileDetails;
}

/**
 * Skill quality metrics
 */
export interface SkillMetrics {
  /** Trigger phrase precision (0-100) */
  triggerPrecision: number;
  /** Content coverage score (0-100) */
  contentCoverage: number;
  /** Reference integrity (0-100) */
  referenceIntegrity: number;
  /** Content structure score (0-100) */
  structureScore: number;
  /** Overall score (weighted average) */
  overallScore: number;
}

/**
 * Quality grade
 */
export type SkillGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Detailed profile information
 */
export interface ProfileDetails {
  description: DescriptionAnalysis;
  content: ContentAnalysis;
  references: ReferenceAnalysis;
  triggers: TriggerAnalysis;
}

/**
 * Description analysis
 */
export interface DescriptionAnalysis {
  length: number;
  startsWithTrigger: boolean;
  triggerPhrase: string | null;
  hasActionVerbs: boolean;
  actionVerbs: string[];
  qualityScore: number;
}

/**
 * Content analysis
 */
export interface ContentAnalysis {
  totalLines: number;
  codeBlocks: number;
  headings: number;
  sections: string[];
  listItems: number;
  hasWorkflow: boolean;
  workflowSteps: number;
}

/**
 * Reference analysis
 */
export interface ReferenceAnalysis {
  total: number;
  valid: number;
  missing: number;
  integrity: number;
}

/**
 * Trigger analysis
 */
export interface TriggerAnalysis {
  phrases: string[];
  count: number;
  uniquePhrases: string[];
  coverage: number;
}