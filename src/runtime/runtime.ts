/**
 * Skill Execution Runtime
 * Simulates skill execution to collect real metrics
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseSkill } from '../lint/core/parser';

/**
 * Execution environment configuration
 */
export interface RuntimeConfig {
  /** Simulated user query */
  testQuery?: string;
  /** Simulated context */
  testContext?: Record<string, any>;
  /** Max execution time (ms) */
  timeout?: number;
}

/**
 * Skill execution result
 */
export interface ExecutionResult {
  skillPath: string;
  skillName: string | null;
  success: boolean;
  metrics: ExecutionMetrics;
  trace: ExecutionTrace;
  errors: string[];
}

/**
 * Execution metrics collected during run
 */
export interface ExecutionMetrics {
  /** Total tokens processed */
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Execution time breakdown */
  timing: TimingBreakdown;
  /** Token cost estimate */
  estimatedCost: number;
  /** Memory usage */
  peakMemoryMb: number;
}

/**
 * Timing breakdown
 */
export interface TimingBreakdown {
  loadTimeMs: number;
  parseTimeMs: number;
  triggerMatchMs: number;
  contextPrepMs: number;
  executionMs: number;
  totalMs: number;
}

/**
 * Execution trace for debugging
 */
export interface ExecutionTrace {
  /** Steps executed */
  steps: TraceStep[];
  /** Token usage per step */
  tokenUsage: TokenUsage[];
  /** Errors encountered */
  errors: string[];
}

/**
 * Single trace step
 */
export interface TraceStep {
  step: number;
  name: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Token usage snapshot
 */
export interface TokenUsage {
  step: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Skill Runtime - executes skills in a controlled environment
 */
export class SkillRuntime {
  private config: Required<RuntimeConfig>;

  constructor(config: RuntimeConfig = {}) {
    this.config = {
      testQuery: config.testQuery || 'Analyze this code for best practices',
      testContext: config.testContext || {},
      timeout: config.timeout || 30000
    };
  }

  /**
   * Execute a skill and collect metrics
   */
  async execute(skillPath: string): Promise<ExecutionResult> {
    const errors: string[] = [];
    const trace: ExecutionTrace = { steps: [], tokenUsage: [], errors: [] };
    const timing: TimingBreakdown = {
      loadTimeMs: 0,
      parseTimeMs: 0,
      triggerMatchMs: 0,
      contextPrepMs: 0,
      executionMs: 0,
      totalMs: Date.now()
    };

    let content: string;
    let parsed: ReturnType<typeof parseSkill>;

    // Step 1: Load skill
    const loadStart = Date.now();
    try {
      content = fs.readFileSync(skillPath, 'utf-8');
    } catch (e) {
      errors.push(`Failed to load skill: ${e}`);
      return this.createErrorResult(skillPath, errors);
    }
    timing.loadTimeMs = Date.now() - loadStart;

    // Step 2: Parse skill
    const parseStart = Date.now();
    try {
      parsed = parseSkill(content);
      parsed.skillPath = skillPath;
    } catch (e) {
      errors.push(`Failed to parse skill: ${e}`);
      return this.createErrorResult(skillPath, errors);
    }
    timing.parseTimeMs = Date.now() - parseStart;

    // Step 3: Trigger matching (simulate)
    const triggerStart = Date.now();
    const triggerMatch = this.simulateTriggerMatch(parsed, this.config.testQuery);
    timing.triggerMatchMs = Date.now() - triggerStart;

    if (!triggerMatch.matched) {
      errors.push(`Skill not triggered by query: "${this.config.testQuery}"`);
    }

    // Step 4: Context preparation
    const contextStart = Date.now();
    const contextPrep = this.prepareContext(parsed, this.config.testContext);
    timing.contextPrepMs = Date.now() - contextStart;

    // Step 5: Execution (simulate)
    const execStart = Date.now();
    const execution = this.simulateExecution(parsed, triggerMatch);
    timing.executionMs = Date.now() - execStart;

    timing.totalMs = timing.loadTimeMs + timing.parseTimeMs + timing.triggerMatchMs + timing.contextPrepMs + timing.executionMs;

    // Calculate metrics
    const metrics = this.calculateMetrics(content, parsed, timing, execution);

    return {
      skillPath,
      skillName: parsed.frontmatter?.name || null,
      success: errors.length === 0 && execution.success,
      metrics,
      trace,
      errors
    };
  }

  /**
   * Simulate trigger matching
   */
  private simulateTriggerMatch(parsed: ReturnType<typeof parseSkill>, query: string): {
    matched: boolean;
    confidence: number;
    matchedPhrases: string[];
  } {
    const description = parsed.frontmatter?.description || '';
    const lowerDesc = description.toLowerCase();
    const lowerQuery = query.toLowerCase();

    const triggerPhrases = [
      'use when', 'when the user', 'use this', 'trigger when',
      'activates when', 'for when', 'whenever'
    ];

    const matchedPhrases: string[] = [];
    let matchScore = 0;

    for (const phrase of triggerPhrases) {
      if (lowerDesc.includes(phrase)) {
        matchedPhrases.push(phrase);
        matchScore += 0.3;
      }
    }

    // Check if query contains action verbs from description
    const actionVerbs = ['analyze', 'check', 'review', 'create', 'build', 'fix', 'debug', 'test'];
    for (const verb of actionVerbs) {
      if (lowerDesc.includes(verb) && lowerQuery.includes(verb)) {
        matchScore += 0.2;
      }
    }

    return {
      matched: matchScore >= 0.3,
      confidence: Math.min(1, matchScore),
      matchedPhrases
    };
  }

  /**
   * Prepare execution context
   */
  private prepareContext(
    parsed: ReturnType<typeof parseSkill>,
    context: Record<string, any>
  ): { sections: string[]; variables: Record<string, any> } {
    const sections = this.extractSections(parsed.content);
    const variables = {
      ...context,
      skillName: parsed.frontmatter?.name,
      description: parsed.frontmatter?.description,
      hasCodeExamples: parsed.content.includes('```'),
      sectionCount: sections.length
    };

    return { sections, variables };
  }

  /**
   * Simulate skill execution
   */
  private simulateExecution(
    parsed: ReturnType<typeof parseSkill>,
    trigger: { matched: boolean; confidence: number }
  ): { success: boolean; stepsExecuted: number; outputLength: number } {
    if (!trigger.matched) {
      return { success: false, stepsExecuted: 0, outputLength: 0 };
    }

    const sections = this.extractSections(parsed.content);
    const codeBlocks = (parsed.content.match(/```[\s\S]*?```/g) || []).length;

    // Simulate execution steps
    const stepsExecuted = Math.min(sections.length, 5) + Math.min(codeBlocks, 3);

    // Estimate output length based on content
    const outputLength = Math.min(parsed.content.length * 0.3, 2000);

    return {
      success: true,
      stepsExecuted,
      outputLength
    };
  }

  /**
   * Extract sections from content
   */
  private extractSections(content: string): string[] {
    const matches = content.match(/^##\s+(.+)/gm) || [];
    return matches.map(m => m.replace(/^##\s+/, '').trim());
  }

  /**
   * Calculate execution metrics
   */
  private calculateMetrics(
    content: string,
    parsed: ReturnType<typeof parseSkill>,
    timing: TimingBreakdown,
    execution: { stepsExecuted: number; outputLength: number }
  ): ExecutionMetrics {
    // Input tokens: skill content + query
    const skillTokens = Math.ceil(content.length / 4);
    const queryTokens = Math.ceil(this.config.testQuery.length / 4);
    const inputTokens = skillTokens + queryTokens;

    // Output tokens: based on estimated output
    const outputTokens = Math.ceil(execution.outputLength / 4);
    const totalTokens = inputTokens + outputTokens;

    // Cost at GPT-4 rate: $0.03/1K input, $0.06/1K output
    const estimatedCost = (inputTokens / 1000) * 0.03 + (outputTokens / 1000) * 0.06;

    // Memory estimate (rough)
    const peakMemoryMb = Math.ceil(content.length / 1000) + 5;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      timing,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000,
      peakMemoryMb
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(skillPath: string, errors: string[]): ExecutionResult {
    return {
      skillPath,
      skillName: null,
      success: false,
      metrics: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        timing: {
          loadTimeMs: 0,
          parseTimeMs: 0,
          triggerMatchMs: 0,
          contextPrepMs: 0,
          executionMs: 0,
          totalMs: 0
        },
        estimatedCost: 0,
        peakMemoryMb: 0
      },
      trace: { steps: [], tokenUsage: [], errors },
      errors
    };
  }
}

export const skillRuntime = new SkillRuntime();