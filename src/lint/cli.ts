#!/usr/bin/env node

import { Linter } from './core/linter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI for skill linting
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: skill-harness-lint <skill-file-or-directory>');
    process.exit(1);
  }

  const target = args[0];
  const linter = new Linter();

  // Check if target is a file or directory
  const stats = fs.statSync(target);

  if (stats.isDirectory()) {
    // Lint all SKILL.md files in directory
    const files = findSkillFiles(target);
    console.log(`Found ${files.length} skill file(s) to lint\n`);

    for (const file of files) {
      const report = await linter.lintFile(file);
      linter.printReport(report);
    }
  } else {
    // Lint single file
    const report = await linter.lintFile(target);
    linter.printReport(report);

    // Exit with error code if failed
    if (!report.overallPassed) {
      process.exit(1);
    }
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
    } else if (entry.name === 'SKILL.md') {
      files.push(fullPath);
    }
  }

  return files;
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
