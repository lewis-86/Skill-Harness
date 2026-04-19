import { SkillLintReport, BatchLintReport, SkillIssue, IssueSeverity } from './types';
import * as fs from 'fs';

/**
 * SARIF 2.1.0 format exporter
 */
export function exportSarif(batchReport: BatchLintReport): object {
  const runs: object[] = [];

  const results: object[] = [];
  for (const issue of batchReport.topIssues) {
    for (const skill of issue.affectedSkills) {
      results.push({
        ruleId: issue.ruleId,
        ruleName: issue.ruleName,
        level: severityToSarifLevel(issue.severity),
        message: `${issue.ruleName}: ${issue.severity} issue in ${skill}`,
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: skill },
            region: { startLine: 1 }
          }
        }]
      });
    }
  }

  runs.push({
    tool: {
      driver: {
        name: 'Skill Harness Linter',
        version: '1.0.0',
        rules: batchReport.topIssues.map(issue => ({
          id: issue.ruleId,
          name: issue.ruleName,
          shortDescription: { text: issue.ruleName },
          properties: {
            'tags': [issue.severity]
          }
        }))
      }
    },
    results
  });

  return {
    version: '2.1.0',
    schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs
  };
}

/**
 * JUnit XML format exporter
 */
export function exportJUnit(batchReport: BatchLintReport): string {
  const totalFailures = batchReport.summary.skillsByGrade['D'] + batchReport.summary.skillsByGrade['F'];
  const totalTests = batchReport.totalSkills;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Skill Harness Results" tests="${totalTests}" failures="${totalFailures}">
`;

  for (const grade of ['A', 'B', 'C', 'D', 'F'] as const) {
    const skills = batchReport.byGrade[grade];
    if (skills.length === 0) continue;

    const failures = (grade === 'D' || grade === 'F') ? skills.length : 0;

    xml += `  <testsuite name="Grade ${grade}" tests="${skills.length}" failures="${failures}" skipped="0">
`;

    for (const skill of skills) {
      if (failures > 0) {
        xml += `    <testcase name="${escapeXml(skill)}" classname="skill.${grade}"><failure message="Grade ${grade}"/></testcase>
`;
      } else {
        xml += `    <testcase name="${escapeXml(skill)}" classname="skill.${grade}"/>
`;
      }
    }

    xml += `  </testsuite>
`;
  }

  xml += '</testsuites>';

  return xml;
}

/**
 * JSON format exporter (enhanced)
 * Includes AI hints for machine-readable guidance
 */
export function exportJson(batchReport: BatchLintReport): object {
  return {
    version: '1.0.0',
    timestamp: batchReport.timestamp,
    summary: {
      totalSkills: batchReport.totalSkills,
      averageHealthScore: batchReport.summary.averageHealthScore,
      averageGrade: batchReport.summary.averageGrade,
      skillsByGrade: batchReport.summary.skillsByGrade,
      totalIssues: batchReport.summary.totalIssues,
      autoFixable: batchReport.summary.autoFixable,
      qualityDimensions: batchReport.summary.qualityDimensions
    },
    criticalSkills: batchReport.criticalSkills,
    topIssues: batchReport.topIssues.map(i => ({
      ruleId: i.ruleId,
      ruleName: i.ruleName,
      severity: i.severity,
      count: i.count,
      affectedSkills: i.affectedSkills
    })),
    byGrade: batchReport.byGrade,
    byIssue: batchReport.byIssue,
    // AI-friendly metadata
    aiMetadata: {
      description: 'Skill Harness Lint Report - Human & AI Friendly Format',
      qualityDimensions: ['correctness', 'triggerability', 'maintainability', 'performance', 'reusability'],
      issueCategories: ['structure', 'semantic', 'execution', 'style'],
      fixImpactLevels: ['low', 'medium', 'high']
    }
  };
}

/**
 * Markdown format exporter
 */
export function exportMarkdown(batchReport: BatchLintReport): string {
  let md = `# Skill Harness Report\n\n`;
  md += `**Generated:** ${batchReport.timestamp}\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Skills | ${batchReport.totalSkills} |\n`;
  md += `| Average Score | ${batchReport.summary.averageHealthScore}% [${batchReport.summary.averageGrade}] |\n`;
  md += `| Total Issues | ${batchReport.summary.totalIssues} |\n`;
  md += `| Auto-fixable | ${batchReport.summary.autoFixable} |\n\n`;

  // Grade Distribution
  md += `## Grade Distribution\n\n`;
  md += `| Grade | Count | Percentage |\n`;
  md += `|-------|-------|------------|\n`;
  for (const grade of ['A', 'B', 'C', 'D', 'F'] as const) {
    const count = batchReport.summary.skillsByGrade[grade] || 0;
    const pct = Math.round((count / batchReport.totalSkills) * 100);
    md += `| ${grade} | ${count} | ${pct}% |\n`;
  }
  md += `\n`;

  // Critical Skills
  if (batchReport.criticalSkills.length > 0) {
    md += `## Critical Skills\n\n`;
    md += `> These skills need immediate attention (Grade D/F with blockers)\n\n`;
    for (const skill of batchReport.criticalSkills) {
      md += `- ${skill}\n`;
    }
    md += `\n`;
  }

  // Top Issues
  if (batchReport.topIssues.length > 0) {
    md += `## Top Issues\n\n`;
    md += `| Rule | Severity | Count | Affected |\n`;
    md += `|------|----------|-------|----------|\n`;
    for (const issue of batchReport.topIssues.slice(0, 10)) {
      const badge = issue.severity === 'blocker' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      md += `| ${issue.ruleName} | ${badge} ${issue.severity} | ${issue.count} | ${issue.affectedSkills.length} skills |\n`;
    }
    md += `\n`;
  }

  // Skills by Grade
  md += `## Skills by Grade\n\n`;
  for (const grade of ['A', 'B', 'C', 'D', 'F'] as const) {
    const skills = batchReport.byGrade[grade];
    if (skills.length > 0) {
      md += `### Grade ${grade}\n\n`;
      for (const skill of skills) {
        md += `- ${skill}\n`;
      }
      md += `\n`;
    }
  }

  return md;
}

/**
 * Save export to file
 */
export function saveExport(data: object | string, outputPath: string, format: 'json' | 'xml' | 'sarif' | 'md'): void {
  const ext = format === 'sarif' ? 'sarif' : format;
  const finalPath = outputPath.endsWith(`.${ext}`) ? outputPath : `${outputPath}.${ext}`;

  if (format === 'json' || format === 'sarif') {
    fs.writeFileSync(finalPath, JSON.stringify(data, null, 2));
  } else {
    fs.writeFileSync(finalPath, data as string);
  }

  console.log(`📄 Exported ${format.toUpperCase()} to: ${finalPath}`);
}

function severityToSarifLevel(severity: IssueSeverity): string {
  switch (severity) {
    case 'blocker': return 'error';
    case 'warning': return 'warning';
    case 'hint': return 'note';
    default: return 'warning';
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}