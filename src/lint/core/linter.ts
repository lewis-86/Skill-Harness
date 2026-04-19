import { LintReport, ValidationResult, Level, ParsedSkill } from './types';
import { Rule } from './types';
import { parseSkill } from './parser';
import { getAllRules } from './registry';

/**
 * Linter configuration
 */
export interface LinterConfig {
  rules?: Rule[];
  failOnBlocker?: boolean;
  /** Enable/disable specific rules by ID */
  enabledRules?: Record<string, boolean>;
}

/**
 * Linter class - runs all rules against a skill
 */
export class Linter {
  private rules: Rule[];

  constructor(config: LinterConfig = {}) {
    const allRules = config.rules || getAllRules();

    if (config.enabledRules) {
      // Filter rules based on enabled config
      this.rules = allRules.filter(rule => {
        const enabled = config.enabledRules![rule.id];
        return enabled === undefined || enabled === true;
      });
    } else {
      this.rules = allRules;
    }
  }

  /**
   * Lint a skill from content string
   */
  lintContent(content: string, skillPath: string = 'unknown'): LintReport {
    const parsed = parseSkill(content);
    parsed.skillPath = skillPath;
    const results = this.runRules(parsed);

    return this.buildReport(skillPath, parsed, results);
  }

  /**
   * Lint a skill from file path
   */
  async lintFile(filePath: string): Promise<LintReport> {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.lintContent(content, filePath);
  }

  /**
   * Run all rules against a parsed skill
   */
  private runRules(parsed: ParsedSkill): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const rule of this.rules) {
      const result = rule.validate(parsed, parsed.frontmatter);
      results.push(result);
    }

    return results;
  }

  /**
   * Build a lint report from results
   */
  private buildReport(
    skillPath: string,
    parsed: ParsedSkill,
    results: ValidationResult[]
  ): LintReport {
    const blockers = results.filter(r => r.level === Level.BLOCKER && !r.passed);
    const warnings = results.filter(r => r.level === Level.WARNING && !r.passed);
    const hints = results.filter(r => r.level === Level.HINT && !r.passed);

    return {
      skillPath,
      skillName: parsed.frontmatter?.name || null,
      overallPassed: blockers.length === 0,
      blockers,
      warnings,
      hints,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Print report to console
   */
  printReport(report: LintReport): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(` Skill Lint Report: ${report.skillPath}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (report.skillName) {
      console.log(` Skill Name: ${report.skillName}`);
    }

    if (report.overallPassed) {
      console.log('\n✅ PASSED - No blockers found');
    } else {
      console.log('\n❌ FAILED - Blockers detected');
    }

    if (report.blockers.length > 0) {
      console.log('\n🔴 BLOCKERS:');
      for (const result of report.blockers) {
        console.log(`   [${result.ruleId}] ${result.message}`);
      }
    }

    if (report.warnings.length > 0) {
      console.log('\n🟡 WARNINGS:');
      for (const result of report.warnings) {
        console.log(`   [${result.ruleId}] ${result.message}`);
      }
    }

    if (report.hints.length > 0) {
      console.log('\n🔵 HINTS:');
      for (const result of report.hints) {
        console.log(`   [${result.ruleId}] ${result.message}`);
      }
    }

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log(` Timestamp: ${report.timestamp}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}
