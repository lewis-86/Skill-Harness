/**
 * Debug result for a skill
 */
export interface DebugResult {
  skillPath: string;
  skillName: string | null;
  timestamp: string;
  checks: DebugCheck[];
  overallStatus: 'pass' | 'warn' | 'fail';
  /** Execution efficiency analysis */
  execution?: ExecutionProfile;
}

/**
 * Debug check result
 */
export interface DebugCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'skip';
  message: string;
  details?: string[];
  position?: { line: number; column?: number };
}

/**
 * Execution profile for a skill
 */
export interface ExecutionProfile {
  /** Real execution metrics (from runtime) */
  runtime?: RuntimeMetrics;
  /** Estimated token count */
  estimatedTokens?: TokenEstimate;
  /** Execution time analysis */
  timing?: TimingAnalysis;
  /** Efficiency scores */
  efficiency?: EfficiencyScore;
  /** Optimization suggestions */
  suggestions: string[];
}

/**
 * Real runtime metrics
 */
export interface RuntimeMetrics {
  /** Input tokens processed */
  inputTokens: number;
  /** Output tokens generated */
  outputTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Execution timing breakdown */
  timing: {
    loadMs: number;
    parseMs: number;
    triggerMatchMs: number;
    contextPrepMs: number;
    executionMs: number;
    totalMs: number;
  };
  /** Estimated cost (GPT-4 pricing) */
  estimatedCost: number;
  /** Peak memory in MB */
  peakMemoryMb: number;
  /** Whether skill was triggered */
  triggered: boolean;
  /** Match confidence */
  matchConfidence: number;
}

/**
 * Token estimation breakdown
 */
export interface TokenEstimate {
  /** Total estimated tokens */
  total: number;
  /** Token breakdown by section */
  breakdown: {
    frontmatter: number;
    description: number;
    content: number;
    codeBlocks: number;
  };
  /** Estimated cost at $0.003/1K tokens (GPT-4) */
  estimatedCost: number;
}

/**
 * Timing analysis
 */
export interface TimingAnalysis {
  /** Estimated parse time (ms) */
  parseTimeMs: number;
  /** Estimated execution time (ms) */
  estimatedExecTimeMs: number;
  /** Time breakdown */
  breakdown: {
    parsing: number;
    triggerMatch: number;
    contextPrep: number;
    responseGen: number;
  };
  /** Performance grade */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Efficiency score
 */
export interface EfficiencyScore {
  /** Overall efficiency 0-100 */
  overall: number;
  /** Token efficiency (lower tokens for same value = better) */
  tokenEfficiency: number;
  /** Time efficiency */
  timeEfficiency: number;
  /** Complexity score */
  complexityScore: number;
}

/**
 * Reference debug info
 */
export interface ReferenceDebug {
  path: string;
  type: 'markdown' | 'script' | 'data' | 'template' | 'image' | 'url';
  exists: boolean;
  accessible: boolean;
  size?: number;
  resolvedPath?: string;
}

/**
 * Script debug info
 */
export interface ScriptDebug {
  path: string;
  language: string;
  syntaxValid: boolean;
  lines: number;
  errors?: string[];
}

/**
 * Content analysis
 */
export interface DebugContentAnalysis {
  totalLines: number;
  codeBlocks: number;
  headings: number;
  listItems: number;
  links: number;
  images: number;
  commands: string[];
  potentialTriggers: string[];
}