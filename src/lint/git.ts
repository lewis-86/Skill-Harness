import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GitChanges {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  all: string[];
}

/**
 * Get changed SKILL.md files from git
 */
export function getGitChanges(dirPath: string): GitChanges {
  try {
    // Get staged changes
    const stagedOutput = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: dirPath,
      encoding: 'utf-8'
    });
    const staged = stagedOutput.split('\n').filter(f => isSkillFile(f));

    // Get unstaged changes
    const unstagedOutput = execSync('git diff --name-only --diff-filter=ACM', {
      cwd: dirPath,
      encoding: 'utf-8'
    });
    const unstaged = unstagedOutput.split('\n').filter(f => isSkillFile(f));

    // Get untracked files
    const untrackedOutput = execSync('git ls-files --others --exclude-standard', {
      cwd: dirPath,
      encoding: 'utf-8'
    });
    const untracked = untrackedOutput.split('\n').filter(f => isSkillFile(f));

    // Combine all (dedupe)
    const allSet = new Set([...staged, ...unstaged, ...untracked]);
    const all = Array.from(allSet);

    return { staged, unstaged, untracked, all };
  } catch (e) {
    // Not a git repo or git error
    return { staged: [], unstaged: [], untracked: [], all: [] };
  }
}

/**
 * Check if file is a SKILL.md file
 */
function isSkillFile(filePath: string): boolean {
  if (!filePath) return false;
  return filePath.includes('SKILL.md') || filePath.endsWith('.md');
}

/**
 * Get git status summary
 */
export function getGitStatus(dirPath: string): string {
  try {
    const status = execSync('git status --porcelain', {
      cwd: dirPath,
      encoding: 'utf-8'
    });

    const lines = status.split('\n').filter(l => l.trim());
    const skillLines = lines.filter(l => isSkillFile(l));

    return skillLines.join('\n');
  } catch (e) {
    return '';
  }
}

/**
 * Setup pre-commit hook
 */
export function setupPreCommitHook(dirPath: string): boolean {
  const hookPath = path.join(dirPath, '.git', 'hooks', 'pre-commit');
  const hookContent = `#!/bin/sh
# Skill Harness pre-commit hook
# Auto-run lint on changed SKILL.md files

echo "Running Skill Harness pre-commit lint..."

CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E 'SKILL\\.md$|\\-SKILL\\.md$|_SKILL\\.md$|.*-SKILL\\.md$')
if [ -z "$CHANGED_FILES" ]; then
  echo "No SKILL.md files changed, skipping lint."
  exit 0
fi

echo "Changed SKILL.md files:"
echo "$CHANGED_FILES"
echo ""

# Run lint on changed files
npx skill-harness-lint $CHANGED_FILES
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Lint failed. Please fix issues before committing."
  echo "   To skip lint: git commit --no-verify"
  exit 1
fi

echo ""
echo "✅ Lint passed!"
exit 0
`;

  try {
    fs.writeFileSync(hookPath, hookContent);
    fs.chmodSync(hookPath, '755');
    return true;
  } catch (e) {
    return false;
  }
}