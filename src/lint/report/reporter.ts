import { LintReport, ValidationResult, Level } from '../core/types';
import { Rule } from '../core/types';
import { rulesRegistry } from '../core/registry';
import {
  SkillLintReport,
  ReportGrade,
  ReportSummary,
  SkillIssue,
  SkillInsight,
  Recommendation,
  BatchLintReport,
  IssueFrequency,
  RecommendationFrequency,
  IssueSeverity,
  InsightType,
  RecommendationCategory
} from './types';

/**
 * Advanced Lint Reporter
 * Generates comprehensive reports with diagnostics and recommendations
 */
export class LintReporter {
  private rules: Map<string, Rule>;

  constructor() {
    this.rules = rulesRegistry;
  }

  /**
   * Generate advanced report for a single skill
   */
  generateSkillReport(lintReport: LintReport, content: string): SkillLintReport {
    const { issues, insights } = this.analyzeIssues(lintReport, content);
    const summary = this.calculateSummary(lintReport);
    const recommendations = this.generateRecommendations(issues, lintReport);
    const healthScore = this.calculateHealthScore(summary);
    const grade = this.calculateGrade(healthScore);

    return {
      skillPath: lintReport.skillPath,
      skillName: lintReport.skillName,
      timestamp: lintReport.timestamp,
      healthScore,
      grade,
      summary,
      issues,
      insights,
      recommendations,
      metadata: {
        linterVersion: '1.0.0',
        rulesVersion: '1.0.0',
        scanDuration: 0,
        skillSize: content.split('\n').length,
        skillComplexity: this.calculateComplexity(content)
      }
    };
  }

  /**
   * Generate batch report for multiple skills
   */
  generateBatchReport(skillReports: SkillLintReport[]): BatchLintReport {
    const byGrade: Record<ReportGrade, string[]> = {
      A: [], B: [], C: [], D: [], F: []
    };

    const byIssue: Record<string, string[]> = {};
    const issueFrequency: Record<string, { count: number; severity: IssueSeverity }> = {};
    const recommendationFrequency: Record<string, { count: number; category: RecommendationCategory }> = {};

    for (const report of skillReports) {
      // Group by grade
      byGrade[report.grade].push(report.skillName || 'unknown');

      // Group by issue
      for (const issue of report.issues) {
        if (!byIssue[issue.ruleId]) {
          byIssue[issue.ruleId] = [];
          issueFrequency[issue.ruleId] = { count: 0, severity: issue.severity };
        }
        byIssue[issue.ruleId].push(report.skillName || 'unknown');
        issueFrequency[issue.ruleId].count++;
      }

      // Group recommendations
      for (const rec of report.recommendations) {
        const key = `${rec.category}:${rec.action}`;
        if (!recommendationFrequency[key]) {
          recommendationFrequency[key] = { count: 0, category: rec.category };
        }
        recommendationFrequency[key].count++;
      }
    }

    // Calculate top issues
    const topIssues: IssueFrequency[] = Object.entries(issueFrequency)
      .map(([ruleId, data]) => ({
        ruleId,
        ruleName: this.getRuleName(ruleId),
        severity: data.severity,
        count: data.count,
        affectedSkills: byIssue[ruleId]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top recommendations
    const topRecommendations: RecommendationFrequency[] = Object.entries(recommendationFrequency)
      .map(([key, data]) => ({
        category: data.category,
        action: key.split(':')[1],
        count: data.count,
        impact: 'medium' as const
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Critical skills (grade F or D with blockers)
    const criticalSkills = skillReports
      .filter(r => r.grade === 'F' || (r.grade === 'D' && r.summary.blockers > 0))
      .map(r => r.skillName || 'unknown');

    // Calculate overall health
    const avgScore = skillReports.reduce((s, r) => s + r.healthScore, 0) / skillReports.length;

    // Calculate grade distribution
    const skillsByGrade: Record<ReportGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const report of skillReports) {
      skillsByGrade[report.grade]++;
    }

    // Calculate quality dimension scores
    const qualityDimensions = this.calculateQualityDimensions(skillReports);

    return {
      timestamp: new Date().toISOString(),
      totalSkills: skillReports.length,
      summary: {
        averageHealthScore: Math.round(avgScore),
        averageGrade: this.calculateGrade(Math.round(avgScore)),
        skillsByGrade,
        totalIssues: skillReports.reduce((s, r) => s + r.issues.length, 0),
        autoFixable: skillReports.reduce((s, r) => s + r.issues.filter(i => i.autoFixable).length, 0),
        qualityDimensions
      },
      byGrade,
      byIssue,
      topIssues,
      topRecommendations,
      criticalSkills,
      overallHealthScore: Math.round(avgScore)
    };
  }

  /**
   * Analyze issues with context
   */
  private analyzeIssues(lintReport: LintReport, content: string): {
    issues: SkillIssue[];
    insights: SkillInsight[];
  } {
    const issues: SkillIssue[] = [];
    const insights: SkillInsight[] = [];

    const allResults = [...lintReport.blockers, ...lintReport.warnings, ...lintReport.hints];

    for (const result of allResults) {
      if (result.passed) {
        // Positive insight
        if (result.level === Level.HINT) {
          insights.push({
            type: this.getInsightType(result.ruleId),
            message: result.message,
            strength: 80
          });
        }
        continue;
      }

      // Issue
      const severity = this.levelToSeverity(result.level);
      const location = result.position || { line: 0 };
      const snippet = this.extractSnippet(content, location.line);
      const autoFix = this.canAutoFix(result.ruleId);

      issues.push({
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        severity,
        found: this.extractFoundValue(result, content),
        expected: this.getExpectedValue(result),
        location,
        context: this.getContext(content, location.line),
        snippet,
        autoFixable: autoFix,
        fixSuggestion: autoFix ? this.getFixSuggestion(result) : undefined,
        aiHint: result.aiHint
      });
    }

    return { issues, insights };
  }

  /**
   * Calculate summary
   */
  private calculateSummary(lintReport: LintReport): ReportSummary {
    const allResults = [...lintReport.blockers, ...lintReport.warnings, ...lintReport.hints];
    const passed = allResults.filter(r => r.passed).length;

    return {
      totalRules: allResults.length,
      passed,
      blockers: lintReport.blockers.filter(r => !r.passed).length,
      warnings: lintReport.warnings.filter(r => !r.passed).length,
      hints: lintReport.hints.filter(r => !r.passed).length,
      coverage: this.calculateCoverageScore(lintReport),
      triggerQuality: this.calculateTriggerScore(lintReport),
      structureScore: this.calculateStructureScore(lintReport)
    };
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(summary: ReportSummary): number {
    // Start with quality metrics as base (weighted average)
    const qualityBase =
      (summary.coverage * 0.35) +
      (summary.triggerQuality * 0.40) +  // Trigger is most important
      (summary.structureScore * 0.25);

    // Apply penalties for issues
    const blockerPenalty = summary.blockers * 25;
    const warningPenalty = summary.warnings * 8;
    const hintPenalty = summary.hints * 2;

    const score = qualityBase - blockerPenalty - warningPenalty - hintPenalty;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate grade from health score
   */
  private calculateGrade(score: number): ReportGrade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(issues: SkillIssue[], lintReport: LintReport): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group by category
    const byCategory: Record<string, SkillIssue[]> = {};
    for (const issue of issues) {
      const cat = this.ruleIdToCategory(issue.ruleId);
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(issue);
    }

    // Generate recommendations for each category
    for (const [category, categoryIssues] of Object.entries(byCategory)) {
      const critical = categoryIssues.filter(i => i.severity === 'blocker');
      const warnings = categoryIssues.filter(i => i.severity === 'warning');

      if (critical.length > 0) {
        recommendations.push({
          priority: 'critical',
          category: category as RecommendationCategory,
          action: `Fix ${critical.length} critical issue(s) in ${category}`,
          reason: 'These issues prevent the skill from working correctly',
          steps: critical.map(i => `Fix: ${i.found} → ${i.expected || 'valid value'}`),
          effort: 'medium',
          impact: 'high'
        });
      }

      if (warnings.length > 0) {
        recommendations.push({
          priority: 'high',
          category: category as RecommendationCategory,
          action: `Address ${warnings.length} warning(s) in ${category}`,
          reason: 'These issues may affect skill quality',
          steps: warnings.map(i => `Consider: ${i.found}`),
          effort: 'low',
          impact: 'medium'
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate coverage score (0-100)
   * Based on style rules: code blocks, whitespace, list markers
   */
  private calculateCoverageScore(lintReport: LintReport): number {
    const allResults = [...lintReport.blockers, ...lintReport.warnings, ...lintReport.hints];
    const coverageRules = allResults.filter(r =>
      r.ruleId.startsWith('style-')
    );

    if (coverageRules.length === 0) return 100;

    const passed = coverageRules.filter(r => r.passed).length;
    const total = coverageRules.length;

    // Weight: blockers are critical, warnings are important, hints are minor
    let score = 0;
    for (const rule of coverageRules) {
      if (rule.passed) {
        score += rule.level === Level.BLOCKER ? 100 :
                rule.level === Level.WARNING ? 90 : 80;
      } else {
        score += rule.level === Level.BLOCKER ? 0 :
                rule.level === Level.WARNING ? 40 : 70;
      }
    }

    return Math.round(score / total);
  }

  /**
   * Calculate trigger quality score (0-100)
   * Based on semantic rules: description start, triggers, no placeholders
   */
  private calculateTriggerScore(lintReport: LintReport): number {
    const allResults = [...lintReport.blockers, ...lintReport.warnings, ...lintReport.hints];
    const triggerRules = allResults.filter(r =>
      r.ruleId.startsWith('semantic-')
    );

    if (triggerRules.length === 0) return 100;

    let score = 0;
    for (const rule of triggerRules) {
      if (rule.passed) {
        // description-start and description-trigger are most important
        if (rule.ruleId === 'semantic-001') score += 100;
        else if (rule.ruleId === 'semantic-003') score += 95;
        else if (rule.ruleId === 'semantic-004') score += 90;
        else if (rule.ruleId === 'semantic-002') score += 85;
        else score += 80;
      } else {
        // Failed rules
        if (rule.ruleId === 'semantic-001') score += 0;   // Critical - no good trigger
        else if (rule.ruleId === 'semantic-003') score += 30;
        else if (rule.ruleId === 'semantic-004') score += 40;  // Placeholders hurt discoverability
        else if (rule.ruleId === 'semantic-002') score += 50;
        else score += 50;
      }
    }

    return Math.round(score / triggerRules.length);
  }

  /**
   * Calculate structure score (0-100)
   * Based on struct rules: frontmatter, name, description, format
   */
  private calculateStructureScore(lintReport: LintReport): number {
    const allResults = [...lintReport.blockers, ...lintReport.warnings, ...lintReport.hints];
    const structRules = allResults.filter(r =>
      r.ruleId.startsWith('struct-')
    );

    if (structRules.length === 0) return 100;

    let score = 0;
    for (const rule of structRules) {
      if (rule.passed) {
        // Frontmatter and required fields are most important
        if (rule.ruleId === 'struct-001') score += 100;
        else if (rule.ruleId === 'struct-002') score += 100;
        else if (rule.ruleId === 'struct-003') score += 100;
        else if (rule.ruleId === 'struct-004') score += 90;
        else if (rule.ruleId === 'struct-005') score += 85;
        else if (rule.ruleId === 'struct-006') score += 85;
        else score += 80;
      } else {
        // Failed rules
        if (rule.ruleId === 'struct-001') score += 0;   // Missing frontmatter - critical
        else if (rule.ruleId === 'struct-002') score += 10;  // Missing name - critical
        else if (rule.ruleId === 'struct-003') score += 20;  // Missing description
        else if (rule.ruleId === 'struct-004') score += 50;
        else if (rule.ruleId === 'struct-005') score += 60;
        else if (rule.ruleId === 'struct-006') score += 65;
        else score += 50;
      }
    }

    return Math.round(score / structRules.length);
  }

  /**
   * Calculate quality dimension scores (Human & AI friendly)
   * Maps rules to quality dimensions for targeted improvements
   */
  private calculateQualityDimensions(skillReports: SkillLintReport[]): Record<string, number> {
    const dimensions = {
      correctness: { total: 0, passed: 0 },
      triggerability: { total: 0, passed: 0 },
      maintainability: { total: 0, passed: 0 },
      performance: { total: 0, passed: 0 },
      reusability: { total: 0, passed: 0 }
    };

    // Map rule prefixes to dimensions
    const dimensionMap: Record<string, (keyof typeof dimensions)[]> = {
      'struct-': ['correctness', 'maintainability'],
      'semantic-': ['triggerability', 'reusability'],
      'exec-': ['correctness', 'performance'],
      'style-': ['maintainability', 'reusability']
    };

    for (const report of skillReports) {
      for (const issue of report.issues) {
        const prefix = issue.ruleId.split('-')[0] + '-';
        const rules = dimensionMap[prefix] || ['maintainability'];
        for (const dim of rules) {
          dimensions[dim].total++;
          if (issue.severity === 'hint') {
            dimensions[dim].passed++;
          }
        }
      }
    }

    // Calculate scores
    const result: Record<string, number> = {};
    for (const [dim, data] of Object.entries(dimensions)) {
      if (data.total === 0) {
        result[dim] = 100;
      } else {
        const passRate = 1 - (data.total - data.passed) / data.total;
        result[dim] = Math.round(passRate * 100);
      }
    }

    return result;
  }

  /**
   * Calculate content complexity
   */
  private calculateComplexity(content: string): number {
    const lines = content.split('\n').length;
    const codeBlocks = (content.match(/```/g) || []).length;
    const headings = (content.match(/^#+\s/gm) || []).length;

    // Simple complexity metric
    return Math.min(100, Math.round((lines / 10) + (codeBlocks * 5) + (headings * 3)));
  }

  /**
   * Helper: Level to severity
   */
  private levelToSeverity(level: Level): IssueSeverity {
    switch (level) {
      case Level.BLOCKER: return 'blocker';
      case Level.WARNING: return 'warning';
      default: return 'hint';
    }
  }

  /**
   * Helper: Get rule name
   */
  private getRuleName(ruleId: string): string {
    const rule = this.rules.get(ruleId);
    return rule?.name || ruleId;
  }

  /**
   * Helper: Get insight type from rule
   */
  private getInsightType(ruleId: string): InsightType {
    if (ruleId.startsWith('semantic')) return 'good-trigger';
    if (ruleId.startsWith('struct')) return 'good-structure';
    if (ruleId.startsWith('style')) return 'good-coverage';
    return 'best-practice';
  }

  /**
   * Helper: Extract snippet around line
   */
  private extractSnippet(content: string, line: number): string | undefined {
    const lines = content.split('\n');
    if (line <= 0 || line > lines.length) return undefined;

    const start = Math.max(0, line - 2);
    const end = Math.min(lines.length, line + 2);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Helper: Extract found value from result
   */
  private extractFoundValue(result: ValidationResult, content: string): string {
    return result.message;
  }

  /**
   * Helper: Get expected value for a rule
   */
  private getExpectedValue(result: ValidationResult): string | undefined {
    // Rule-specific expected values
    const expected: Record<string, string> = {
      'struct-001': 'Valid frontmatter with --- markers',
      'struct-002': 'name field in frontmatter',
      'struct-003': 'description field in frontmatter',
      'semantic-001': 'Description starting with "Use when..."',
      'semantic-004': 'No placeholder text like [xxx], TBD, TODO'
    };
    return expected[result.ruleId];
  }

  /**
   * Helper: Get context around line
   */
  private getContext(content: string, line: number): string {
    const lines = content.split('\n');
    if (line <= 0 || line > lines.length) return '';
    return lines[line - 1].trim();
  }

  /**
   * Helper: Check if rule result can be auto-fixed
   */
  private canAutoFix(ruleId: string): boolean {
    const autoFixableRules = ['style-001', 'style-002', 'semantic-001', 'struct-005', 'struct-006'];
    return autoFixableRules.includes(ruleId);
  }

  /**
   * Helper: Get fix suggestion for a rule
   */
  private getFixSuggestion(result: ValidationResult): string | undefined {
    const suggestions: Record<string, string> = {
      'style-001': 'Add language identifier to code block, e.g., ```javascript',
      'style-002': 'Remove trailing whitespace from line',
      'semantic-001': 'Start description with "Use when..." for better triggering',
      'struct-005': 'Shorten name to 64 characters or less',
      'struct-006': 'Shorten description to 2048 characters or less, or add "..." if truncated'
    };
    return suggestions[result.ruleId];
  }

  /**
   * Helper: Map rule ID to category
   */
  private ruleIdToCategory(ruleId: string): string {
    const prefix = ruleId.split('-')[0];
    const categories: Record<string, string> = {
      struct: 'structure',
      semantic: 'trigger',
      exec: 'references',
      style: 'style'
    };
    return categories[prefix] || 'content';
  }
}

export const lintReporter = new LintReporter();