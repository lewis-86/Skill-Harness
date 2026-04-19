#!/usr/bin/env node

import { Linter } from './core/linter';
import { lintReporter } from './report/reporter';
import { reportFormatter } from './report/formatter';
import { SkillLintReport } from './report/types';
import { skillFixer, FixResult } from './fixer';
import { exportSarif, exportJUnit, exportJson, exportMarkdown, saveExport } from './report/exporter';
import { getGitChanges, setupPreCommitHook, GitChanges } from './git';
import { runInteractive } from './interactive';
import { compareDirs, formatCompareMarkdown } from './compare';
import * as fs from 'fs';
import * as path from 'path';
import { isGitHubInput, cloneGitHubRepo, cleanupTempDirs } from '../utils/github';

/**
 * CLI for skill linting
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const fixMode = args.includes('--fix') || args.includes('--dry-run');
  const dryRun = args.includes('--dry-run');
  const gitMode = args.includes('--git');
  const interactiveMode = args.includes('--interactive') || args.includes('-i');
  const installHook = args.includes('--install-hook');
  const exportFormat = args.find(a => a.startsWith('--format='))?.split('=')[1] as 'json' | 'sarif' | 'junit' | 'md' | undefined;
  const cleanArgs = args.filter(a => !a.startsWith('--'));

  if (cleanArgs.length === 0) {
    console.log('Usage: skill-harness-lint <path> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --fix          Apply automatic fixes to fixable issues');
    console.log('  --dry-run      Show what would be fixed without applying');
    console.log('  --git          Only lint files changed in git');
    console.log('  -i, --interactive  Interactive mode with menu');
    console.log('  --install-hook  Install pre-commit hook for git');
    console.log('  --format=      Export format: json, sarif, junit, md');
    console.log('  --output=      Output file path (default: stdout)');
    console.log('');
    console.log('Examples:');
    console.log('  skill-harness-lint ./skills/');
    console.log('  skill-harness-lint ./skills/ --fix');
    console.log('  skill-harness-lint ./skills/ --git');
    console.log('  skill-harness-lint ./skills/ -i');
    console.log('  skill-harness-lint ./skills/ --install-hook');
    console.log('  skill-harness-lint ./skills/ --format=sarif --output=report.sarif');
    console.log('  skill-harness-lint --compare dir1 dir2');
    process.exit(1);
  }

  // Compare mode
  const compareIdx = args.indexOf('--compare');
  if (compareIdx !== -1 && cleanArgs.length >= 2) {
    const leftDir = cleanArgs[0];
    const rightDir = cleanArgs[1];

    if (!fs.existsSync(leftDir)) {
      console.error(`❌ Directory not found: ${leftDir}`);
      process.exit(1);
    }
    if (!fs.existsSync(rightDir)) {
      console.error(`❌ Directory not found: ${rightDir}`);
      process.exit(1);
    }

    console.log('\n🔄 Comparing directories...\n');
    const result = compareDirs(leftDir, rightDir);
    const md = formatCompareMarkdown(result);
    console.log(md);

    const outFile = args.find(a => a.startsWith('--output='))?.split('=')[1];
    if (outFile) {
      fs.writeFileSync(outFile, md);
      console.log(`📄 Report saved to: ${outFile}`);
    }
    process.exit(0);
  }

  const target = cleanArgs[0];
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];
  let targetPath = target;
  let isTempDir = false;

  // Check if target is a GitHub URL or shorthand
  if (isGitHubInput(target)) {
    console.log('🔗 Detected GitHub input\n');
    targetPath = cloneGitHubRepo(target);
    isTempDir = true;
  }

  // Check if target exists
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Path not found: ${targetPath}`);
    if (isTempDir) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
    process.exit(1);
  }

  const linter = new Linter();
  const stats = fs.statSync(targetPath);

  // Install pre-commit hook if requested
  if (installHook) {
    if (!stats.isDirectory()) {
      console.error('❌ --install-hook requires a directory');
      process.exit(1);
    }
    const success = setupPreCommitHook(targetPath);
    if (success) {
      console.log('✅ Pre-commit hook installed at .git/hooks/pre-commit');
    } else {
      console.error('❌ Failed to install pre-commit hook');
    }
    process.exit(success ? 0 : 1);
  }

  if (stats.isDirectory()) {
    // Interactive mode
    if (interactiveMode) {
      await runInteractive(targetPath);
      process.exit(0);
    }

    // Git mode: only lint changed files
    if (gitMode) {
      const changes = getGitChanges(targetPath);
      if (changes.all.length === 0) {
        console.log('✨ No changed SKILL.md files in git');
        process.exit(0);
      }
      console.log('\n📂 Git mode: only linting changed files\n');
      console.log(`Staged: ${changes.staged.length}, Unstaged: ${changes.unstaged.length}, Untracked: ${changes.untracked.length}`);
      console.log('');

      const skillReports: SkillLintReport[] = [];
      for (const file of changes.all) {
        const fullPath = path.join(targetPath, file);
        if (fs.existsSync(fullPath)) {
          const lintReport = await linter.lintFile(fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const skillReport = lintReporter.generateSkillReport(lintReport, content);
          skillReports.push(skillReport);
          console.log(reportFormatter.formatSkillReport(skillReport));
        }
      }

      if (skillReports.length > 1) {
        const batchReport = lintReporter.generateBatchReport(skillReports);
        console.log(reportFormatter.formatBatchReport(batchReport));
      }
      process.exit(0);
    }
    // Lint all SKILL.md files in directory
    const files = findSkillFiles(targetPath);
    console.log(`\nFound ${files.length} skill file(s)\n`);

    const skillReports: SkillLintReport[] = [];
    const fixResults: FixResult[] = [];

    for (const file of files) {
      const lintReport = await linter.lintFile(file);
      const content = fs.readFileSync(file, 'utf-8');
      const skillReport = lintReporter.generateSkillReport(lintReport, content);
      skillReports.push(skillReport);

      if (fixMode) {
        const fixResult = skillFixer.fix(lintReport, content, dryRun);
        fixResults.push(fixResult);
        if (fixResult.fixed) {
          if (dryRun) {
            console.log(`\n📝 Would fix: ${file}`);
            printDiff(fixResult);
          } else {
            fs.writeFileSync(file, fixResult.changes[fixResult.changes.length - 1].after);
            console.log(`\n✅ Fixed: ${file} (${fixResult.changes.length} change(s))`);
          }
        }
      } else {
        console.log(reportFormatter.formatSkillReport(skillReport));
      }
    }

    // Generate batch report if not in fix mode
    if (!fixMode && skillReports.length > 1) {
      const batchReport = lintReporter.generateBatchReport(skillReports);
      console.log(reportFormatter.formatBatchReport(batchReport));

      // Export if format specified
      if (exportFormat) {
        const outputPath = outputFile || `lint-report.${exportFormat}`;
        if (exportFormat === 'sarif') {
          saveExport(exportSarif(batchReport), outputPath, 'sarif');
        } else if (exportFormat === 'junit') {
          saveExport(exportJUnit(batchReport), outputPath, 'xml');
        } else if (exportFormat === 'md') {
          saveExport(exportMarkdown(batchReport), outputPath, 'md');
        } else {
          saveExport(exportJson(batchReport), outputPath, 'json');
        }
      }
    }

    // Summary for fix mode
    if (fixMode && fixResults.length > 0) {
      const totalFixed = fixResults.filter(r => r.fixed).length;
      const totalChanges = fixResults.reduce((s, r) => s + r.changes.length, 0);
      console.log(`\n${dryRun ? '💡 Would fix' : '✅ Fixed'}: ${totalFixed} file(s), ${totalChanges} total change(s)`);
    }
  } else {
    // Lint single file
    const lintReport = await linter.lintFile(targetPath);
    const content = fs.readFileSync(targetPath, 'utf-8');
    const skillReport = lintReporter.generateSkillReport(lintReport, content);

    if (fixMode) {
      const fixResult = skillFixer.fix(lintReport, content, dryRun);
      if (fixResult.fixed) {
        console.log(`\n${dryRun ? '📝 Would fix:' : '✅ Fixed:'}`);
        printDiff(fixResult);
        if (!dryRun) {
          fs.writeFileSync(targetPath, fixResult.changes[fixResult.changes.length - 1].after);
          console.log(`Applied ${fixResult.changes.length} fix(es) to ${targetPath}`);
        }
      } else {
        console.log('\n✨ No auto-fixable issues found');
      }
    } else {
      console.log(reportFormatter.formatSkillReport(skillReport));

      // Export if format specified
      if (exportFormat) {
        // Create a single-item batch report for export
        const batchReport = lintReporter.generateBatchReport([skillReport]);
        const outputPath = outputFile || `lint-report.${exportFormat}`;
        if (exportFormat === 'sarif') {
          saveExport(exportSarif(batchReport), outputPath, 'sarif');
        } else if (exportFormat === 'junit') {
          saveExport(exportJUnit(batchReport), outputPath, 'xml');
        } else if (exportFormat === 'md') {
          saveExport(exportMarkdown(batchReport), outputPath, 'md');
        } else {
          saveExport(exportJson(batchReport), outputPath, 'json');
        }
      }

      // Exit with error code if failed
      if (skillReport.grade === 'F' || skillReport.summary.blockers > 0) {
        if (isTempDir) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
        process.exit(1);
      }
    }
  }

  // Cleanup temp directory if cloned from GitHub
  if (isTempDir) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

/**
 * Recursively find all SKILL.md files in a directory
 */
function findSkillFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        files.push(...findSkillFiles(fullPath));
      }
    } else if (entry.name === 'SKILL.md' || entry.name.endsWith('-SKILL.md') || entry.name.endsWith('_SKILL.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Print diff of changes
 */
function printDiff(fixResult: FixResult): void {
  for (const change of fixResult.changes) {
    if (change.ruleId === 'style-001') {
      // Code block language fix - show summary
      const beforeLines = change.before.split('\n');
      const afterLines = change.after.split('\n');
      let count = 0;
      for (let i = 0; i < beforeLines.length; i++) {
        if (beforeLines[i] !== afterLines[i]) {
          count++;
          console.log(`    - ${beforeLines[i]}`);
          console.log(`    + ${afterLines[i]}`);
        }
      }
      console.log(`    (${count} code block(s) fixed)`);
    } else if (change.ruleId === 'style-002') {
      // Trailing whitespace fix
      const beforeLines = change.before.split('\n');
      const afterLines = change.after.split('\n');
      let count = 0;
      for (let i = 0; i < beforeLines.length; i++) {
        if (beforeLines[i] !== afterLines[i]) {
          count++;
          const lineContent = beforeLines[i].replace(/\s+$/, '');
          console.log(`    - "${lineContent}" (line ${i + 1}, had trailing whitespace)`);
          console.log(`    + "${afterLines[i]}"`);
        }
      }
      console.log(`    (${count} line(s) fixed)`);
    } else if (change.ruleId === 'semantic-001') {
      // Description trigger fix
      const beforeLines = change.before.split('\n');
      const afterLines = change.after.split('\n');
      for (let i = 0; i < beforeLines.length; i++) {
        if (beforeLines[i] !== afterLines[i]) {
          console.log(`    - ${beforeLines[i]}`);
          console.log(`    + ${afterLines[i]}`);
          break;
        }
      }
      console.log(`    (description trigger fixed)`);
    } else if (change.ruleId === 'struct-006') {
      // Description length fix
      const beforeLines = change.before.split('\n');
      const afterLines = change.after.split('\n');
      for (let i = 0; i < beforeLines.length; i++) {
        if (beforeLines[i] !== afterLines[i]) {
          console.log(`    - ${beforeLines[i].substring(0, 80)}...`);
          console.log(`    + ${afterLines[i].substring(0, 80)}...`);
          break;
        }
      }
      console.log(`    (description truncated)`);
    } else {
      // Generic diff
      const beforeLines = change.before.split('\n');
      const afterLines = change.after.split('\n');
      let count = 0;
      for (let i = 0; i < beforeLines.length; i++) {
        if (beforeLines[i] !== afterLines[i]) {
          count++;
        }
      }
      console.log(`    (${count} line(s) changed)`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});