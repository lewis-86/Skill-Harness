import {
  SkillLintReport,
  BatchLintReport,
  ReportGrade,
  IssueSeverity,
  SkillIssue,
  SkillInsight,
  Recommendation
} from './types';

/**
 * Rich Console Formatter for Lint Reports
 */
export class ReportFormatter {
  private useColor: boolean;

  constructor(useColor = true) {
    this.useColor = useColor;
  }

  /**
   * Format a single skill report
   */
  formatSkillReport(report: SkillLintReport): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(this.color('═══════════════════════════════════════════════════════════════', 'cyan'));
    lines.push(this.color('  SKILL LINT REPORT', 'bold'));
    lines.push('═══════════════════════════════════════════════════════════════');

    // Skill info
    lines.push(this.color(`  Skill: ${report.skillName || 'unknown'}`, 'white', 'bold'));
    lines.push(`  Path:  ${report.skillPath}`);

    // Health score and grade
    const gradeColor = this.gradeColor(report.grade);
    lines.push('');
    lines.push(`  ${this.color('Health Score:', 'white')} ${report.healthScore}/100  ${this.color(`[${report.grade}]`, gradeColor, 'bold')}`);

    // Summary bar
    lines.push('');
    lines.push(`  ${this.color('Summary:', 'white')}`);
    lines.push(`    Total Rules: ${report.summary.totalRules}`);
    lines.push(`    ${this.color('Passed:', 'green')} ${report.summary.passed}  ${this.color('Blockers:', 'red')} ${report.summary.blockers}  ${this.color('Warnings:', 'yellow')} ${report.summary.warnings}  ${this.color('Hints:', 'blue')} ${report.summary.hints}`);

    // Coverage metrics
    lines.push('');
    lines.push(`  ${this.color('Quality Metrics:', 'white')}`);
    lines.push(`    Coverage: ${this.bar(report.summary.coverage)} ${report.summary.coverage}%`);
    lines.push(`    Trigger:  ${this.bar(report.summary.triggerQuality)} ${report.summary.triggerQuality}%`);
    lines.push(`    Struct:   ${this.bar(report.summary.structureScore)} ${report.summary.structureScore}%`);

    // Issues
    if (report.issues.length > 0) {
      lines.push('');
      lines.push(this.color('  ISSUES:', 'red', 'bold'));
      for (const issue of report.issues) {
        lines.push(...this.formatIssue(issue));
      }
    }

    // Insights
    if (report.insights.length > 0) {
      lines.push('');
      lines.push(this.color('  INSIGHTS:', 'green', 'bold'));
      for (const insight of report.insights) {
        lines.push(...this.formatInsight(insight));
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('');
      lines.push(this.color('  RECOMMENDATIONS:', 'yellow', 'bold'));
      for (const rec of report.recommendations) {
        lines.push(...this.formatRecommendation(rec));
      }
    }

    // Footer
    lines.push('');
    lines.push(this.color('───────────────────────────────────────────────────────────────', 'dim'));
    lines.push(`  Timestamp: ${report.timestamp}`);
    lines.push(`  Complexity: ${report.metadata.skillComplexity}  |  Size: ${report.metadata.skillSize} lines`);
    lines.push(this.color('═══════════════════════════════════════════════════════════════', 'cyan'));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format a batch report
   */
  formatBatchReport(report: BatchLintReport): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(this.color('═══════════════════════════════════════════════════════════════', 'cyan'));
    lines.push(this.color('  BATCH LINT REPORT', 'bold'));
    lines.push('═══════════════════════════════════════════════════════════════');

    // Summary
    lines.push(this.color('\n  OVERVIEW', 'white', 'bold'));
    lines.push(`    Total Skills: ${report.totalSkills}`);
    lines.push(`    Average Score: ${report.summary.averageHealthScore}/100 ${this.color(`[${report.summary.averageGrade}]`, this.gradeColor(report.summary.averageGrade), 'bold')}`);

    // Quality dimensions (Human & AI friendly)
    if (report.summary.qualityDimensions) {
      lines.push('');
      lines.push(`    ${this.color('Quality Dimensions:', 'white')}`);
      const dimColors: Record<string, string> = {
        correctness: 'red',
        triggerability: 'cyan',
        maintainability: 'green',
        performance: 'yellow',
        reusability: 'magenta'
      };
      const dimNames: Record<string, string> = {
        correctness: '正确性',
        triggerability: '可触发性',
        maintainability: '可维护性',
        performance: '性能',
        reusability: '可复用性'
      };
      for (const [dim, score] of Object.entries(report.summary.qualityDimensions)) {
        const color = dimColors[dim] || 'white';
        const name = dimNames[dim] || dim;
        lines.push(`      ${this.color(name + ':', color)} ${this.bar(score)} ${score}%`);
      }
    }

    // Grade distribution
    lines.push('');
    lines.push(`    ${this.color('Grade Distribution:', 'white')}`);
    for (const grade of ['A', 'B', 'C', 'D', 'F'] as ReportGrade[]) {
      const count = report.summary.skillsByGrade[grade];
      const pct = Math.round((count / report.totalSkills) * 100);
      const bar = this.bar(pct, 20, false);
      lines.push(`      ${this.color(grade, this.gradeColor(grade), 'bold')}: ${bar} ${count} (${pct}%)`);
    }

    // Critical skills
    if (report.criticalSkills.length > 0) {
      lines.push('');
      lines.push(this.color('  CRITICAL SKILLS (need immediate attention):', 'red', 'bold'));
      for (const skill of report.criticalSkills) {
        lines.push(`    🔴 ${skill}`);
      }
    }

    // Top issues
    if (report.topIssues.length > 0) {
      lines.push('');
      lines.push(this.color('  TOP ISSUES:', 'red', 'bold'));
      for (const issue of report.topIssues.slice(0, 5)) {
        const sevColor = issue.severity === 'blocker' ? 'red' : issue.severity === 'warning' ? 'yellow' : 'blue';
        lines.push(`    ${this.color('[', sevColor)}${this.color(issue.severity.toUpperCase(), sevColor, 'bold')}${this.color(']', sevColor)} ${issue.ruleName} (${issue.count}x)`);
        lines.push(`      Rule: ${issue.ruleId}`);
      }
    }

    // Top recommendations
    if (report.topRecommendations.length > 0) {
      lines.push('');
      lines.push(this.color('  TOP RECOMMENDATIONS:', 'yellow', 'bold'));
      for (const rec of report.topRecommendations) {
        lines.push(`    📋 ${rec.action} (${rec.count}x)`);
        lines.push(`       Impact: ${rec.impact}`);
      }
    }

    // Skills by grade
    lines.push('');
    lines.push(this.color('  SKILLS BY GRADE', 'white', 'bold'));
    for (const grade of ['A', 'B', 'C', 'D', 'F'] as ReportGrade[]) {
      const skills = report.byGrade[grade];
      if (skills.length > 0) {
        lines.push(`  ${this.color(grade, this.gradeColor(grade), 'bold')}:`);
        for (const skill of skills) {
          lines.push(`    • ${skill}`);
        }
      }
    }

    // Footer
    lines.push('');
    lines.push(this.color('═══════════════════════════════════════════════════════════════', 'cyan'));
    lines.push(`  Generated: ${report.timestamp}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format an issue
   */
  private formatIssue(issue: SkillIssue): string[] {
    const lines: string[] = [];
    const sevColor = issue.severity === 'blocker' ? 'red' : issue.severity === 'warning' ? 'yellow' : 'blue';

    lines.push(`    ${this.color('[', sevColor)}${this.color(issue.severity.toUpperCase(), sevColor, 'bold')}${this.color(']', sevColor)} ${issue.ruleName}`);
    lines.push(`      ${this.color('Found:', 'dim')} ${issue.found}`);
    if (issue.expected) {
      lines.push(`      ${this.color('Expected:', 'dim')} ${issue.expected}`);
    }
    lines.push(`      ${this.color('Location:', 'dim')} line ${issue.location.line}`);

    if (issue.autoFixable && issue.fixSuggestion) {
      lines.push(`      ${this.color('Fix:', 'green')} ${issue.fixSuggestion}`);
    }

    // Show AI hints if available (Human & AI friendly)
    if (issue.aiHint) {
      lines.push(...this.formatAIHint(issue.aiHint));
    }

    return lines;
  }

  /**
   * Format AI hints (Human & AI friendly guidance)
   */
  private formatAIHint(hint: any): string[] {
    const lines: string[] = [];
    lines.push(`      ${this.color('💡 AI Hint:', 'cyan')} what: ${hint.what}`);
    if (hint.why) {
      lines.push(`         why: ${hint.why}`);
    }
    if (hint.how) {
      lines.push(`         how: ${hint.how}`);
    }
    if (hint.example) {
      lines.push(`         ${this.color('Example:', 'yellow')} ${hint.example.bad} → ${hint.example.good}`);
    }
    return lines;
  }

  /**
   * Format an insight
   */
  private formatInsight(insight: SkillInsight): string[] {
    const lines: string[] = [];
    const typeIcon = insight.type === 'good-trigger' ? '🎯' : insight.type === 'good-structure' ? '🏗️' : insight.type === 'good-coverage' ? '📚' : '✨';

    lines.push(`    ${typeIcon} ${insight.message}`);
    lines.push(`      ${this.color('Strength:', 'dim')} ${this.bar(insight.strength, 10, false)} ${insight.strength}%`);

    return lines;
  }

  /**
   * Format a recommendation
   */
  private formatRecommendation(rec: Recommendation): string[] {
    const lines: string[] = [];
    const priorityColor = rec.priority === 'critical' ? 'red' : rec.priority === 'high' ? 'yellow' : rec.priority === 'medium' ? 'cyan' : 'dim';

    lines.push(`    ${this.color('[', priorityColor)}${this.color(rec.priority.toUpperCase(), priorityColor, 'bold')}${this.color(']', priorityColor)} ${rec.action}`);
    lines.push(`      ${this.color('Why:', 'dim')} ${rec.reason}`);
    lines.push(`      ${this.color('Effort:', 'dim')} ${rec.effort}  ${this.color('Impact:', 'dim')} ${rec.impact}`);

    return lines;
  }

  /**
   * Create a visual bar
   */
  private bar(value: number, maxWidth = 30, showPercent = true): string {
    const filled = Math.round((value / 100) * maxWidth);
    const empty = maxWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return showPercent ? `${bar} ${value}%` : bar;
  }

  /**
   * Get color for grade
   */
  private gradeColor(grade: ReportGrade): string {
    switch (grade) {
      case 'A': return 'green';
      case 'B': return 'cyan';
      case 'C': return 'yellow';
      case 'D': return 'magenta';
      case 'F': return 'red';
    }
  }

  /**
   * Apply color to string
   */
  private color(str: string, color: string, style?: 'bold' | 'dim'): string {
    if (!this.useColor) return str;

    const codes: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      dim: '\x1b[2m',
      bold: '\x1b[1m',
      reset: '\x1b[0m'
    };

    const colorCode = codes[color] || '';
    const styleCode = style === 'bold' ? codes.bold : style === 'dim' ? codes.dim : '';
    const resetCode = codes.reset;

    return `${styleCode}${colorCode}${str}${resetCode}`;
  }
}

export const reportFormatter = new ReportFormatter();