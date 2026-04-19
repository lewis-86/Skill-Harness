import { skillCompiler } from '../compile/compiler';
import { skillDebugger } from '../debug/debugger';
import { skillProfiler } from '../profile/profiler';
import { Linter } from '../lint/core/linter';
import { LintReport } from '../lint/core/types';
import { lintReporter } from '../lint/report/reporter';
import { reportFormatter } from '../lint/report/formatter';
import { SkillLintReport } from '../lint/report/types';
import { isGitHubInput, cloneGitHubRepo } from '../utils/github';
import * as fs from 'fs';
import * as path from 'path';
import { generateHtmlReport } from './html-report';

export interface WorkflowResult {
  skillPath: string;
  skillName: string;
  lint: 'pass' | 'fail';
  compile: 'success' | 'fail';
  debug: 'pass' | 'warn' | 'fail';
  profileGrade: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  profileScore: number;
  overallStatus: 'ready' | 'needs-work' | 'broken';
}

/**
 * Unified Workflow CLI
 * Runs Lint → Compile → Debug → Profile in sequence
 */
export async function workflowCLI(args: string[]) {
  const inputArg = args[0] || 'fixtures/sota-skills-test';
  const outputPath = args[1] || 'fixtures/harness-report.json';

  let inputPath = inputArg;
  let isTempDir = false;

  // Check if target is a GitHub URL or shorthand
  if (isGitHubInput(inputArg)) {
    console.log('🔗 Detected GitHub input\n');
    inputPath = cloneGitHubRepo(inputArg);
    isTempDir = true;
  }

  console.log('🔧 Skill Harness Workflow\n');
  console.log(`Input:   ${inputPath}`);
  console.log(`Output:  ${outputPath}\n`);

  // Check if path exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Path not found: ${inputPath}`);
    process.exit(1);
  }

  // Get all skill files
  const skillFiles = findSkillFiles(inputPath);
  console.log(`Found ${skillFiles.length} skill(s) to process\n`);

  console.log('═'.repeat(50));
  console.log('STAGE 1: LINT (Parallel)\n');
  console.log('═'.repeat(50));

  // Parallel lint with progress
  const lintStartTime = Date.now();
  const { lintResults, lintReports } = await parallelLint(skillFiles);
  const lintElapsed = Date.now() - lintStartTime;

  const lintPass = lintResults.filter(r => r.overallPassed).length;
  const lintFail = lintResults.length - lintPass;

  console.log(`\n✅ Lint Passed: ${lintPass}`);
  console.log(`❌ Lint Failed: ${lintFail}`);
  console.log(`⏱️  Time: ${lintElapsed}ms`);

  // Generate batch lint report
  if (lintReports.length > 0) {
    const batchReport = lintReporter.generateBatchReport(lintReports);
    console.log(reportFormatter.formatBatchReport(batchReport));
  }

  console.log('\n' + '═'.repeat(50));
  console.log('STAGE 2: COMPILE (Parallel)\n');
  console.log('═'.repeat(50));

  const compileStartTime = Date.now();
  const compileResults = skillCompiler.compileDirectory(inputPath);
  const compileElapsed = Date.now() - compileStartTime;

  const compileSuccess = compileResults.filter(r => r.success).length;
  const compileFail = compileResults.length - compileSuccess;

  console.log(`\n✅ Compile Success: ${compileSuccess}`);
  console.log(`❌ Compile Failed: ${compileFail}`);
  console.log(`⏱️  Time: ${compileElapsed}ms`);

  console.log('\n' + '═'.repeat(50));
  console.log('STAGE 3: DEBUG (Parallel)\n');
  console.log('═'.repeat(50));

  const debugStartTime = Date.now();
  const debugResults = await parallelDebug(skillFiles);
  const debugElapsed = Date.now() - debugStartTime;

  const debugPass = debugResults.filter(r => r.overallStatus === 'pass').length;
  const debugWarn = debugResults.filter(r => r.overallStatus === 'warn').length;
  const debugFail = debugResults.filter(r => r.overallStatus === 'fail').length;

  console.log(`\n✅ Debug Pass: ${debugPass}`);
  console.log(`⚠️  Debug Warn: ${debugWarn}`);
  console.log(`❌ Debug Fail: ${debugFail}`);
  console.log(`⏱️  Time: ${debugElapsed}ms`);

  console.log('\n' + '═'.repeat(50));
  console.log('STAGE 4: PROFILE (Parallel)\n');
  console.log('═'.repeat(50));

  const profileStartTime = Date.now();
  const profileResults = await parallelProfile(skillFiles);
  const profileElapsed = Date.now() - profileStartTime;

  const gradeDist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const r of profileResults) {
    gradeDist[r.qualityGrade]++;
  }

  console.log('\nGrade Distribution:');
  for (const [grade, count] of Object.entries(gradeDist)) {
    const pct = Math.round((count / profileResults.length) * 100);
    console.log(`  ${grade}: ${count} (${pct}%)`);
  }

  const avgScore = Math.round(
    profileResults.reduce((s, r) => s + r.metrics.overallScore, 0) / profileResults.length
  );
  console.log(`\nAverage Score: ${avgScore}%`);
  console.log(`⏱️  Time: ${profileElapsed}ms`);

  // Generate combined report
  console.log('\n' + '═'.repeat(50));
  console.log('GENERATING REPORT\n');
  console.log('═'.repeat(50));

  const combinedReport = {
    timestamp: new Date().toISOString(),
    inputPath: inputArg,
    summary: {
      total: lintResults.length,
      lint: { pass: lintPass, fail: lintFail },
      compile: { success: compileSuccess, fail: compileFail },
      debug: { pass: debugPass, warn: debugWarn, fail: debugFail },
      profile: {
        averageScore: avgScore,
        gradeDistribution: gradeDist
      }
    },
    lintReports,
    debugReports: debugResults,
    skills: profileResults.map(r => {
      const debugResult = debugResults.find(d => d.skillName === r.skillName);
      return {
        name: r.skillName,
        path: r.skillPath,
        profileGrade: r.qualityGrade,
        profileScore: r.metrics.overallScore,
        lintPassed: lintResults.find(l => l.skillName === r.skillName)?.overallPassed || false,
        compileSuccess: compileResults.find(c => c.skillName === r.skillName)?.success || false,
        debugStatus: debugResult?.overallStatus || 'unknown',
        execution: debugResult?.execution ? {
          estimatedTokens: debugResult.execution.estimatedTokens ? {
            total: debugResult.execution.estimatedTokens.total,
            estimatedCost: debugResult.execution.estimatedTokens.estimatedCost
          } : undefined,
          timing: debugResult.execution.timing ? {
            estimatedExecTimeMs: debugResult.execution.timing.estimatedExecTimeMs,
            grade: debugResult.execution.timing.grade
          } : undefined,
          efficiency: debugResult.execution.efficiency ? {
            overall: debugResult.execution.efficiency.overall
          } : undefined
        } : undefined
      };
    })
  };

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(combinedReport, null, 2));
  console.log(`\n📄 JSON Report saved to: ${outputPath}`);

  // Generate HTML report
  const htmlPath = outputPath.replace('.json', '.html');
  generateHtmlReport(combinedReport, htmlPath);
  console.log(`📄 HTML Report saved to: ${htmlPath}`);

  // Final summary
  const readyCount = combinedReport.skills.filter(
    s => s.lintPassed && s.compileSuccess && (s.debugStatus === 'pass' || s.debugStatus === 'warn')
  ).length;

  console.log('\n' + '═'.repeat(50));
  console.log('FINAL SUMMARY\n');
  console.log('═'.repeat(50));
  console.log(`\n🟢 Ready for use: ${readyCount}`);
  console.log(`🟡 Needs review: ${combinedReport.summary.debug.warn}`);
  console.log(`🔴 Broken: ${combinedReport.summary.debug.fail}`);
  console.log(`\n⏱️  Total time: ${lintElapsed + compileElapsed + debugElapsed + profileElapsed}ms`);
  console.log('\n');

  // Cleanup temp directory if cloned from GitHub
  if (isTempDir) {
    fs.rmSync(inputPath, { recursive: true, force: true });
  }
}

/**
 * Find all SKILL.md files in a directory
 */
function findSkillFiles(dirPath: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const skillPath = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        files.push(skillPath);
      }
    } else if (entry.endsWith('.md') && entry.includes('SKILL')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parallel lint processing
 */
async function parallelLint(files: string[]): Promise<{
  lintResults: LintReport[];
  lintReports: SkillLintReport[];
}> {
  const linter = new Linter();
  const lintResults: LintReport[] = [];
  const lintReports: SkillLintReport[] = [];

  // Process in parallel with concurrency limit
  const concurrency = 10;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const lintResult = linter.lintContent(content, file);
        const skillReport = lintReporter.generateSkillReport(lintResult, content);
        return { lintResult, skillReport };
      })
    );

    for (const { lintResult, skillReport } of results) {
      lintResults.push(lintResult);
      lintReports.push(skillReport);
    }

    // Progress
    process.stdout.write(`\r  Processed ${Math.min(i + concurrency, files.length)}/${files.length}`);
  }
  console.log('');

  return { lintResults, lintReports };
}

/**
 * Parallel debug processing
 */
async function parallelDebug(files: string[]): Promise<ReturnType<typeof skillDebugger.debug>[]> {
  const concurrency = 10;
  const results: ReturnType<typeof skillDebugger.debug>[] = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(file => skillDebugger.debug(file))
    );
    results.push(...batchResults);
    process.stdout.write(`\r  Processed ${Math.min(i + concurrency, files.length)}/${files.length}`);
  }
  console.log('');

  return results;
}

/**
 * Parallel profile processing
 */
async function parallelProfile(files: string[]): Promise<ReturnType<typeof skillProfiler.profile>[]> {
  const concurrency = 5;
  const results: ReturnType<typeof skillProfiler.profile>[] = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(file => {
        try {
          return skillProfiler.profile(file);
        } catch {
          return null;
        }
      })
    );
    results.push(...batchResults.filter(r => r !== null) as any);
    process.stdout.write(`\r  Processed ${Math.min(i + concurrency, files.length)}/${files.length}`);
  }
  console.log('');

  return results;
}

// Run if called directly
if (require.main === module) {
  workflowCLI(process.argv.slice(2)).catch(console.error);
}