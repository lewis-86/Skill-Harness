import { skillProfiler } from './profiler';
import * as fs from 'fs';
import * as path from 'path';
import { ProfileResult } from './types';

/**
 * Profile directory of skills
 */
function profileDirectory(dirPath: string): ProfileResult[] {
  const results: ProfileResult[] = [];
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const skillPath = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        try {
          results.push(skillProfiler.profile(skillPath));
        } catch (e) {
          // Skip files that can't be profiled
        }
      }
    } else if (entry.endsWith('.md') && entry.includes('SKILL')) {
      try {
        results.push(skillProfiler.profile(fullPath));
      } catch (e) {
        // Skip files that can't be profiled
      }
    }
  }

  return results;
}

/**
 * Grade color
 */
function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '🟢';
    case 'B': return '🔵';
    case 'C': return '🟡';
    case 'D': return '🟠';
    case 'F': return '🔴';
    default: return '⚪';
  }
}

/**
 * Profile CLI
 */
export async function profileCLI(args: string[]) {
  const inputPath = args[0] || 'fixtures/sota-skills-test';

  console.log('📊 Skill Profiler\n');
  console.log(`Input:  ${inputPath}\n`);

  const stat = fs.statSync(inputPath);
  let results: ProfileResult[];

  if (stat.isDirectory()) {
    console.log('📦 Profiling directory...\n');
    results = profileDirectory(inputPath);
  } else {
    console.log('📄 Profiling single skill...\n');
    results = [skillProfiler.profile(inputPath)];
  }

  // Sort by overall score
  results.sort((a, b) => b.metrics.overallScore - a.metrics.overallScore);

  // Print top results
  console.log('═══ Top Skills ═══\n');
  for (const result of results.slice(0, 10)) {
    const grade = gradeColor(result.qualityGrade);
    console.log(`${grade} ${result.skillName || 'unknown'} [${result.qualityGrade}] ${result.metrics.overallScore}%`);
    console.log(`   Trigger: ${result.metrics.triggerPrecision}% | Coverage: ${result.metrics.contentCoverage}% | Integrity: ${result.metrics.referenceIntegrity}%`);
  }

  // Grade distribution
  console.log('\n═══ Grade Distribution ═══\n');
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const result of results) {
    grades[result.qualityGrade]++;
  }
  for (const [grade, count] of Object.entries(grades)) {
    const pct = Math.round((count / results.length) * 100);
    const bar = '█'.repeat(Math.round(pct / 5));
    console.log(`${gradeColor(grade)} ${grade}: ${count} (${pct}%) ${bar}`);
  }

  // Average scores
  const avgTrigger = Math.round(results.reduce((s, r) => s + r.metrics.triggerPrecision, 0) / results.length);
  const avgCoverage = Math.round(results.reduce((s, r) => s + r.metrics.contentCoverage, 0) / results.length);
  const avgIntegrity = Math.round(results.reduce((s, r) => s + r.metrics.referenceIntegrity, 0) / results.length);
  const avgOverall = Math.round(results.reduce((s, r) => s + r.metrics.overallScore, 0) / results.length);

  console.log('\n═══ Average Scores ═══\n');
  console.log(`Overall:     ${avgOverall}%`);
  console.log(`Trigger:     ${avgTrigger}%`);
  console.log(`Coverage:    ${avgCoverage}%`);
  console.log(`Integrity:   ${avgIntegrity}%`);

  // Common recommendations
  const allRecs: Record<string, number> = {};
  for (const result of results) {
    for (const rec of result.recommendations) {
      allRecs[rec] = (allRecs[rec] || 0) + 1;
    }
  }

  const topRecs = Object.entries(allRecs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topRecs.length > 0) {
    console.log('\n═══ Common Issues ═══\n');
    for (const [rec, count] of topRecs) {
      console.log(`  [${count}] ${rec}`);
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`Total profiled: ${results.length}`);
  console.log(`═══════════════════════════════════════\n`);
}

// Run if called directly
if (require.main === module) {
  profileCLI(process.argv.slice(2)).catch(console.error);
}