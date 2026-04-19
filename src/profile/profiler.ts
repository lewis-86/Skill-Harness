import * as fs from 'fs';
import * as path from 'path';
import { parseSkill } from '../lint/core/parser';
import {
  ProfileResult,
  SkillMetrics,
  SkillGrade,
  ProfileDetails,
  DescriptionAnalysis,
  ContentAnalysis,
  ReferenceAnalysis,
  TriggerAnalysis
} from './types';

/**
 * Trigger phrase patterns
 */
const TRIGGER_PATTERNS = [
  'use when',
  'use this when',
  'use this skill',
  'trigger when',
  'activates when',
  'use whenever',
  'when the user',
  'whenever the user',
];

/**
 * Action verbs
 */
const ACTION_VERBS = [
  'create', 'build', 'generate', 'design', 'implement',
  'analyze', 'review', 'check', 'validate', 'test',
  'execute', 'run', 'process', 'handle', 'manage',
  'connect', 'access', 'search', 'query', 'fetch',
  'extract', 'download', 'upload', 'send', 'receive',
  'debug', 'fix', 'repair', 'recover', 'restore',
  'optimize', 'improve', 'enhance', 'upgrade', 'update',
];

/**
 * Required sections for a well-structured skill
 */
const REQUIRED_SECTIONS = [
  'overview', 'usage', 'examples', 'workflow',
  'setup', 'configuration', 'troubleshooting'
];

/**
 * Skill Profiler
 * Analyzes and scores skill quality
 */
export class SkillProfiler {
  /**
   * Profile a skill file
   */
  profile(skillPath: string): ProfileResult {
    // Read skill content
    let content: string;
    try {
      content = fs.readFileSync(skillPath, 'utf-8');
    } catch (e) {
      throw new Error(`Cannot read skill file: ${skillPath}`);
    }

    // Parse skill
    const parsed = parseSkill(content);
    parsed.skillPath = skillPath;

    // Analyze components
    const description = this.analyzeDescription(parsed);
    const contentAnalysis = this.analyzeContent(parsed);
    const references = this.analyzeReferences(content, path.dirname(skillPath));
    const triggers = this.analyzeTriggers(parsed);

    // Calculate metrics
    const metrics = this.calculateMetrics(description, contentAnalysis, references, triggers);

    // Determine grade
    const qualityGrade = this.calculateGrade(metrics.overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      description,
      contentAnalysis,
      references,
      triggers,
      metrics
    );

    return {
      skillPath,
      skillName: parsed.frontmatter?.name || null,
      timestamp: new Date().toISOString(),
      metrics,
      qualityGrade,
      recommendations,
      details: {
        description,
        content: contentAnalysis,
        references,
        triggers
      }
    };
  }

  /**
   * Analyze description quality
   */
  private analyzeDescription(parsed: ReturnType<typeof parseSkill>): DescriptionAnalysis {
    const fm = parsed.frontmatter;
    const description = fm?.description || '';
    const lower = description.toLowerCase();

    // Check if starts with trigger
    let startsWithTrigger = false;
    let triggerPhrase: string | null = null;

    for (const pattern of TRIGGER_PATTERNS) {
      if (lower.startsWith(pattern)) {
        startsWithTrigger = true;
        triggerPhrase = pattern;
        break;
      }
    }

    // Find action verbs
    const actionVerbs: string[] = [];
    for (const verb of ACTION_VERBS) {
      if (lower.includes(verb)) {
        actionVerbs.push(verb);
      }
    }

    // Quality score for description
    let qualityScore = 50;
    if (startsWithTrigger) qualityScore += 20;
    if (description.length > 50) qualityScore += 10;
    if (description.length > 100) qualityScore += 10;
    if (actionVerbs.length >= 2) qualityScore += 10;
    qualityScore = Math.min(100, qualityScore);

    return {
      length: description.length,
      startsWithTrigger,
      triggerPhrase,
      hasActionVerbs: actionVerbs.length > 0,
      actionVerbs: [...new Set(actionVerbs)],
      qualityScore
    };
  }

  /**
   * Analyze content structure
   */
  private analyzeContent(parsed: ReturnType<typeof parseSkill>): ContentAnalysis {
    const content = parsed.content;
    const lines = content.split('\n');

    // Count structural elements
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    const headings = (content.match(/^#{1,6}\s/gm) || []).length;
    const listItems = (content.match(/^[\s]*[-*+]\s/gm) || []).length;

    // Extract section names (H2 headings)
    const sectionMatches = content.match(/^##\s+(.+)/gm) || [];
    const sections = sectionMatches.map(s => s.replace(/^##\s+/, '').trim().toLowerCase());

    // Check for workflow indicators
    const workflowIndicators = [
      'step', 'phase', 'stage', 'workflow',
      'process', 'procedure', 'task'
    ];
    const hasWorkflow = workflowIndicators.some(w =>
      content.toLowerCase().includes(w)
    );

    // Count workflow steps
    const workflowSteps = (content.match(/(?:step|phase|task)\s+\d+/gi) || []).length;

    return {
      totalLines: lines.length,
      codeBlocks,
      headings,
      sections,
      listItems,
      hasWorkflow,
      workflowSteps
    };
  }

  /**
   * Analyze references
   */
  private analyzeReferences(content: string, baseDir: string): ReferenceAnalysis {
    const patterns = [
      /\[([^\]]+)\]\(([^)]+)\)/g,  // markdown links
      /scripts\/[\w-]+\.\w+/g,     // script paths
      /templates?\/[\w-]+\.\w+/g, // template paths
    ];

    const allRefs: string[] = [];
    for (const regex of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        allRefs.push(match[2] || match[0]);
      }
    }

    // Check which exist
    let valid = 0;
    let missing = 0;
    for (const ref of allRefs) {
      if (ref.startsWith('http://') || ref.startsWith('https://')) {
        valid++; // External URLs are assumed valid
      } else {
        const resolved = path.resolve(baseDir, ref);
        if (fs.existsSync(resolved)) {
          valid++;
        } else {
          missing++;
        }
      }
    }

    const total = allRefs.length || 1; // Avoid division by zero
    const integrity = Math.round((valid / total) * 100);

    return {
      total: allRefs.length,
      valid,
      missing,
      integrity
    };
  }

  /**
   * Analyze trigger phrases
   */
  private analyzeTriggers(parsed: ReturnType<typeof parseSkill>): TriggerAnalysis {
    const fm = parsed.frontmatter;
    const description = fm?.description || '';
    const lower = description.toLowerCase();

    // Find all trigger phrases
    const phrases: string[] = [];
    for (const pattern of TRIGGER_PATTERNS) {
      if (lower.includes(pattern)) {
        phrases.push(pattern);
      }
    }

    // Check for numbered steps or phases
    const hasSteps = /\d+\.\s+\w+/.test(description) || /\d+\)\s+\w+/.test(description);
    const hasWhenUser = lower.includes('when the user') || lower.includes('whenever the user');

    // Coverage score
    let coverage = 0;
    if (phrases.length > 0) coverage += 30;
    if (hasWhenUser) coverage += 30;
    if (hasSteps) coverage += 20;
    if (description.length > 100) coverage += 20;

    return {
      phrases,
      count: phrases.length,
      uniquePhrases: [...new Set(phrases)],
      coverage: Math.min(100, coverage)
    };
  }

  /**
   * Calculate overall metrics
   */
  private calculateMetrics(
    description: DescriptionAnalysis,
    content: ContentAnalysis,
    references: ReferenceAnalysis,
    triggers: TriggerAnalysis
  ): SkillMetrics {
    // Trigger precision (from description analysis)
    const triggerPrecision = description.qualityScore;

    // Content coverage
    let contentCoverage = 0;
    if (content.headings >= 3) contentCoverage += 30;
    if (content.codeBlocks >= 1) contentCoverage += 20;
    if (content.listItems >= 3) contentCoverage += 20;
    if (content.hasWorkflow) contentCoverage += 15;
    if (content.totalLines >= 50) contentCoverage += 15;
    contentCoverage = Math.min(100, contentCoverage);

    // Reference integrity
    const referenceIntegrity = references.integrity;

    // Structure score
    let structureScore = 0;
    if (description.startsWithTrigger) structureScore += 25;
    if (description.hasActionVerbs) structureScore += 25;
    if (content.headings >= 2) structureScore += 25;
    if (content.listItems >= 2) structureScore += 25;

    // Overall score (weighted average)
    const overallScore = Math.round(
      triggerPrecision * 0.25 +
      contentCoverage * 0.25 +
      referenceIntegrity * 0.25 +
      structureScore * 0.25
    );

    return {
      triggerPrecision,
      contentCoverage,
      referenceIntegrity,
      structureScore,
      overallScore
    };
  }

  /**
   * Calculate quality grade
   */
  private calculateGrade(score: number): SkillGrade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    description: DescriptionAnalysis,
    content: ContentAnalysis,
    references: ReferenceAnalysis,
    triggers: TriggerAnalysis,
    metrics: SkillMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Description recommendations
    if (!description.startsWithTrigger) {
      recommendations.push('Description should start with a trigger phrase like "Use when..."');
    }
    if (description.length < 50) {
      recommendations.push('Description is too short - add more context about when to use this skill');
    }
    if (!description.hasActionVerbs) {
      recommendations.push('Include action verbs (create, build, analyze, etc.) in description');
    }

    // Content recommendations
    if (content.headings < 2) {
      recommendations.push('Add more section headings to improve readability');
    }
    if (content.codeBlocks === 0) {
      recommendations.push('Consider adding code examples to demonstrate usage');
    }
    if (!content.hasWorkflow) {
      recommendations.push('Document the workflow or process steps for using this skill');
    }

    // Reference recommendations
    if (references.missing > 0) {
      recommendations.push(`Fix ${references.missing} missing references`);
    }

    // Trigger recommendations
    if (triggers.count === 0) {
      recommendations.push('Add more trigger phrases to improve skill activation');
    }

    // Performance recommendations
    if (metrics.overallScore < 70) {
      recommendations.push('Overall quality needs improvement - consider a full review');
    }

    return recommendations;
  }
}

export const skillProfiler = new SkillProfiler();