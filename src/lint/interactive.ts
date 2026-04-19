import { Linter } from './core/linter';
import { lintReporter } from './report/reporter';
import { reportFormatter } from './report/formatter';
import { skillFixer } from './fixer';
import { SkillLintReport } from './report/types';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interactive CLI mode
 */
export async function runInteractive(dirPath: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const linter = new Linter();
  const files = findSkillFiles(dirPath);

  if (files.length === 0) {
    console.log('❌ No SKILL.md files found');
    rl.close();
    return;
  }

  console.log('\n🔧 Skill Harness Interactive Mode\n');
  console.log(`Found ${files.length} skill file(s)\n`);

  let selectedFiles: string[] = files;
  let currentFilter: string | null = null;
  let viewMode: 'all' | 'issues' | 'grade-a' | 'grade-f' = 'all';

  while (true) {
    console.clear();
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Skill Harness Interactive');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Filter files
    if (viewMode === 'issues') {
      selectedFiles = files.filter(f => {
        const content = fs.readFileSync(f, 'utf-8');
        const report = linter.lintContent(content, f);
        return !report.overallPassed;
      });
    } else if (viewMode === 'grade-a') {
      selectedFiles = files.filter(f => {
        const content = fs.readFileSync(f, 'utf-8');
        const report = linter.lintContent(content, f);
        const skillReport = lintReporter.generateSkillReport(report, content);
        return skillReport.grade === 'A';
      });
    } else if (viewMode === 'grade-f') {
      selectedFiles = files.filter(f => {
        const content = fs.readFileSync(f, 'utf-8');
        const report = linter.lintContent(content, f);
        const skillReport = lintReporter.generateSkillReport(report, content);
        return skillReport.grade === 'F';
      });
    } else {
      selectedFiles = files;
    }

    // Summary
    console.log(`Files: ${selectedFiles.length}/${files.length} | Filter: ${viewMode}\n`);

    // Show menu
    console.log('  1-9   Select file to view details');
    console.log('  [a]   View all skills');
    console.log('  [i]   View only skills with issues');
    console.log('  [A]   View only Grade A skills');
    console.log('  [F]   View only Grade F skills');
    console.log('  [f]   Apply auto-fix (dry run)');
    console.log('  [h]   AI Hints view (focused on fix guidance)');
    console.log('  [q]   Quit\n');

    // Show first 9 files
    const displayFiles = selectedFiles.slice(0, 9);
    displayFiles.forEach((f, i) => {
      const content = fs.readFileSync(f, 'utf-8');
      const report = linter.lintContent(content, f);
      const skillReport = lintReporter.generateSkillReport(report, content);
      const gradeColor = skillReport.grade === 'A' ? '\x1b[32m' : skillReport.grade === 'F' ? '\x1b[31m' : '\x1b[33m';
      const name = path.basename(path.dirname(f)) + '/' + path.basename(f);
      console.log(`  ${i + 1}. ${gradeColor}[${skillReport.grade}]${'\x1b[0m'} ${name} (${skillReport.healthScore}%)`);
    });

    if (selectedFiles.length > 9) {
      console.log(`  ... and ${selectedFiles.length - 9} more`);
    }

    const answer = await askQuestion(rl, '\n> ');

    if (answer === 'q') {
      console.log('\n👋 Goodbye!');
      rl.close();
      break;
    } else if (answer === 'a') {
      viewMode = 'all';
    } else if (answer === 'i') {
      viewMode = 'issues';
    } else if (answer === 'A') {
      viewMode = 'grade-a';
    } else if (answer === 'F') {
      viewMode = 'grade-f';
    } else if (answer === 'f') {
      console.clear();
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  Auto-Fix Preview (Dry Run)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      let fixedCount = 0;
      for (const file of selectedFiles.slice(0, 5)) {
        const content = fs.readFileSync(file, 'utf-8');
        const report = linter.lintContent(content, file);
        const fixResult = skillFixer.fix(report, content, true);

        if (fixResult.fixed) {
          fixedCount++;
          console.log(`📝 ${path.basename(file)}:`);
          for (const change of fixResult.changes) {
            console.log(`   [${change.ruleName}] ${change.ruleId}`);
          }
        }
      }
      console.log(`\n✨ Would fix ${fixedCount} file(s)`);
      await askQuestion(rl, '\nPress Enter to continue...');
    } else if (answer === 'h') {
      console.clear();
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  AI Hints View - Focus on Fix Guidance');
      console.log('═══════════════════════════════════════════════════════════════\n');

      for (const file of selectedFiles.slice(0, 10)) {
        const content = fs.readFileSync(file, 'utf-8');
        const report = linter.lintContent(content, file);
        const skillReport = lintReporter.generateSkillReport(report, content);

        if (skillReport.issues.length > 0) {
          console.log(`📄 ${skillReport.skillName || path.basename(file)} (${skillReport.grade})`);
          for (const issue of skillReport.issues.slice(0, 3)) {
            if (issue.aiHint) {
              console.log(`   💡 [${issue.ruleId}] ${issue.aiHint.what}`);
              console.log(`      how: ${issue.aiHint.how}`);
            } else {
              console.log(`   🔧 [${issue.ruleId}] ${issue.found}`);
            }
          }
          console.log('');
        }
      }
      await askQuestion(rl, '\nPress Enter to continue...');
    } else {
      const idx = parseInt(answer) - 1;
      if (idx >= 0 && idx < displayFiles.length) {
        const file = displayFiles[idx];
        console.clear();
        const content = fs.readFileSync(file, 'utf-8');
        const report = linter.lintContent(content, file);
        const skillReport = lintReporter.generateSkillReport(report, content);
        console.log(reportFormatter.formatSkillReport(skillReport));

        // Offer fix
        const fixResult = skillFixer.fix(report, content, true);
        if (fixResult.fixed) {
          console.log('\n💡 Auto-fix available. Apply? [y/N] ');
          const fixAnswer = await askQuestion(rl, '> ');
          if (fixAnswer === 'y') {
            const applyResult = skillFixer.fix(report, content, false);
            fs.writeFileSync(file, applyResult.changes[applyResult.changes.length - 1].after);
            console.log(`✅ Applied ${applyResult.changes.length} fix(es)`);
          }
        }
        await askQuestion(rl, '\nPress Enter to continue...');
      }
    }
  }
}

function findSkillFiles(dir: string): string[] {
  const files: string[] = [];
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

function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer.trim().toLowerCase());
    });
  });
}