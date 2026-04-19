import { Linter } from './core/linter';
import { lintReporter } from './report/reporter';
import { ReportGrade } from './report/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Compare result between two directories
 */
export interface CompareResult {
  leftDir: string;
  rightDir: string;
  leftOnly: string[];
  rightOnly: string[];
  common: string[];
  scoreDiff: Record<string, number>;
  gradeChanges: {
    improved: Array<{ skill: string; from: ReportGrade; to: ReportGrade }>;
    degraded: Array<{ skill: string; from: ReportGrade; to: ReportGrade }>;
    same: Array<{ skill: string; grade: ReportGrade }>;
  };
  summary: {
    leftAvgScore: number;
    rightAvgScore: number;
    scoreDiff: number;
    improvedCount: number;
    degradedCount: number;
  };
}

/**
 * Compare two skill directories
 */
export function compareDirs(leftDir: string, rightDir: string): CompareResult {
  const linter = new Linter();

  // Get skill files from both directories
  const leftFiles = getSkillFiles(leftDir);
  const rightFiles = getSkillFiles(rightDir);

  const leftNames = new Set(leftFiles.map(f => path.basename(f)));
  const rightNames = new Set(rightFiles.map(f => path.basename(f)));

  const leftOnly = Array.from(leftNames).filter(n => !rightNames.has(n));
  const rightOnly = Array.from(rightNames).filter(n => !leftNames.has(n));
  const common = Array.from(leftNames).filter(n => rightNames.has(n));

  // Compare common files
  const scoreDiff: Record<string, number> = {};
  const gradeChanges: CompareResult['gradeChanges'] = { improved: [], degraded: [], same: [] };

  for (const name of common) {
    const leftFile = leftFiles.find(f => path.basename(f) === name)!;
    const rightFile = rightFiles.find(f => path.basename(f) === name)!;

    const leftContent = fs.readFileSync(leftFile, 'utf-8');
    const rightContent = fs.readFileSync(rightFile, 'utf-8');

    const leftReport = linter.lintContent(leftContent, leftFile);
    const rightReport = linter.lintContent(rightContent, rightFile);

    const leftSkillReport = lintReporter.generateSkillReport(leftReport, leftContent);
    const rightSkillReport = lintReporter.generateSkillReport(rightReport, rightContent);

    const diff = rightSkillReport.healthScore - leftSkillReport.healthScore;
    scoreDiff[name] = diff;

    if (diff > 0) {
      gradeChanges.improved.push({
        skill: name,
        from: leftSkillReport.grade,
        to: rightSkillReport.grade
      });
    } else if (diff < 0) {
      gradeChanges.degraded.push({
        skill: name,
        from: leftSkillReport.grade,
        to: rightSkillReport.grade
      });
    } else {
      gradeChanges.same.push({ skill: name, grade: leftSkillReport.grade });
    }
  }

  // Calculate summary
  const leftAvgScore = common.length > 0
    ? common.reduce((sum, name) => {
        const file = leftFiles.find(f => path.basename(f) === name)!;
        const content = fs.readFileSync(file, 'utf-8');
        const report = linter.lintContent(content, file);
        const skillReport = lintReporter.generateSkillReport(report, content);
        return sum + skillReport.healthScore;
      }, 0) / common.length
    : 0;

  const rightAvgScore = common.length > 0
    ? common.reduce((sum, name) => {
        const file = rightFiles.find(f => path.basename(f) === name)!;
        const content = fs.readFileSync(file, 'utf-8');
        const report = linter.lintContent(content, file);
        const skillReport = lintReporter.generateSkillReport(report, content);
        return sum + skillReport.healthScore;
      }, 0) / common.length
    : 0;

  return {
    leftDir,
    rightDir,
    leftOnly,
    rightOnly,
    common,
    scoreDiff,
    gradeChanges,
    summary: {
      leftAvgScore: Math.round(leftAvgScore),
      rightAvgScore: Math.round(rightAvgScore),
      scoreDiff: Math.round(rightAvgScore - leftAvgScore),
      improvedCount: gradeChanges.improved.length,
      degradedCount: gradeChanges.degraded.length
    }
  };
}

/**
 * Format compare result as markdown
 */
export function formatCompareMarkdown(result: CompareResult): string {
  let md = `# Skill Harness Comparison Report\n\n`;

  md += `**Left:** \`${result.leftDir}\`\n`;
  md += `**Right:** \`${result.rightDir}\`\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Metric | Left | Right | Diff |\n`;
  md += `|--------|------|-------|------|\n`;
  md += `| Average Score | ${result.summary.leftAvgScore}% | ${result.summary.rightAvgScore}% | ${result.summary.scoreDiff > 0 ? '+' : ''}${result.summary.scoreDiff}% |\n`;
  md += `| Common Skills | ${result.common.length} | ${result.common.length} | - |\n`;
  md += `| Improved | ${result.summary.improvedCount} | ${result.summary.improvedCount} | - |\n`;
  md += `| Degraded | ${result.summary.degradedCount} | ${result.summary.degradedCount} | - |\n\n`;

  // Only in left
  if (result.leftOnly.length > 0) {
    md += `## Only in Left\n\n`;
    for (const name of result.leftOnly) {
      md += `- ${name}\n`;
    }
    md += '\n';
  }

  // Only in right
  if (result.rightOnly.length > 0) {
    md += `## Only in Right\n\n`;
    for (const name of result.rightOnly) {
      md += `- ${name}\n`;
    }
    md += '\n';
  }

  // Improved
  if (result.gradeChanges.improved.length > 0) {
    md += `## 🟢 Improved (${result.gradeChanges.improved.length})\n\n`;
    md += `| Skill | From | To | Score |\n`;
    md += `|-------|------|----|-------|\n`;
    for (const change of result.gradeChanges.improved) {
      const diff = result.scoreDiff[change.skill];
      md += `| ${change.skill} | ${change.from} | ${change.to} | ${diff > 0 ? '+' : ''}${diff}% |\n`;
    }
    md += '\n';
  }

  // Degraded
  if (result.gradeChanges.degraded.length > 0) {
    md += `## 🔴 Degraded (${result.gradeChanges.degraded.length})\n\n`;
    md += `| Skill | From | To | Score |\n`;
    md += `|-------|------|----|-------|\n`;
    for (const change of result.gradeChanges.degraded) {
      const diff = result.scoreDiff[change.skill];
      md += `| ${change.skill} | ${change.from} | ${change.to} | ${diff > 0 ? '+' : ''}${diff}% |\n`;
    }
    md += '\n';
  }

  // Unchanged
  if (result.gradeChanges.same.length > 0) {
    md += `## ⚪ Unchanged (${result.gradeChanges.same.length})\n\n`;
    for (const item of result.gradeChanges.same) {
      md += `- ${item.skill} [${item.grade}]\n`;
    }
    md += '\n';
  }

  return md;
}

function getSkillFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const skillPath = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        files.push(skillPath);
      }
    } else if (entry.name === 'SKILL.md' || entry.name.endsWith('-SKILL.md') || entry.name.endsWith('_SKILL.md')) {
      files.push(fullPath);
    }
  }

  return files;
}