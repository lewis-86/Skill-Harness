import { LintReport, ValidationResult, ParsedSkill } from './core/types';

/**
 * Auto-fix result
 */
export interface FixResult {
  filePath: string;
  fixed: boolean;
  changes: FixChange[];
  error?: string;
}

/**
 * A single fix applied
 */
export interface FixChange {
  ruleId: string;
  ruleName: string;
  before: string;
  after: string;
  line: number;
}

/**
 * Skill fixer - applies automatic fixes to skill files
 */
export class SkillFixer {
  /**
   * Fix a skill file
   */
  fix(lintReport: LintReport, content: string, dryRun = true): FixResult {
    const changes: FixChange[] = [];
    const allResults = [...lintReport.blockers, ...lintReport.warnings, ...lintReport.hints];
    const failedResults = allResults.filter(r => !r.passed);

    let fixedContent = content;

    for (const result of failedResults) {
      const fix = this.getFix(result, fixedContent);
      if (fix) {
        changes.push(fix);
        fixedContent = fix.after;
      }
    }

    return {
      filePath: lintReport.skillPath,
      fixed: changes.length > 0,
      changes,
      error: changes.length === 0 && failedResults.length > 0
        ? 'No auto-fixable issues found'
        : undefined
    };
  }

  /**
   * Get fix for a validation result
   */
  private getFix(result: ValidationResult, content: string): FixChange | null {
    switch (result.ruleId) {
      case 'style-001':
        return this.fixCodeBlockLanguage(content, result);
      case 'style-002':
        return this.fixTrailingWhitespace(content, result);
      case 'semantic-001':
        return this.fixDescriptionTrigger(content, result);
      case 'struct-006':
        return this.fixDescriptionLength(content, result);
      default:
        return null;
    }
  }

  /**
   * Fix description trigger - prepend "Use when" if not present
   */
  private fixDescriptionTrigger(content: string, result: ValidationResult): FixChange | null {
    const lines = content.split('\n');

    // Find frontmatter and description
    let inFrontmatter = false;
    let descriptionLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          break;
        }
      } else if (inFrontmatter && line.startsWith('description:')) {
        descriptionLineIdx = i;
        break;
      }
    }

    if (descriptionLineIdx === -1) return null;

    const descLine = lines[descriptionLineIdx];
    const match = descLine.match(/^(description:\s*)(.*)$/);
    if (!match) return null;

    const [, prefix, desc] = match;
    const trimmedDesc = desc.trim();

    // Check if already starts with valid trigger
    const validTriggers = [
      'use when', 'use this', 'use whenever', 'use it to',
      'execute ', 'analyzes ', 'analyze ', 'delegate ',
      'for when', 'for ', 'when the user', 'whenever the user', 'when you need',
      'create ', 'creates ', 'build ', 'design ', 'guide ', 'manage '
    ];
    const lowerDesc = trimmedDesc.toLowerCase();

    // Check if any valid trigger is at the start
    const startsWithTrigger = validTriggers.some(t => lowerDesc.startsWith(t));

    if (startsWithTrigger) {
      return null; // Already valid, no fix needed
    }

    // Prepend "Use when" to make it triggerable
    const newDescLine = `${prefix}Use when ${trimmedDesc}`;
    const newLines = [...lines];
    newLines[descriptionLineIdx] = newDescLine;

    return {
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      before: lines.join('\n'),
      after: newLines.join('\n'),
      line: descriptionLineIdx + 1
    };
  }

  /**
   * Fix description length - truncate if too long
   */
  private fixDescriptionLength(content: string, result: ValidationResult): FixChange | null {
    const MAX_LENGTH = 2048;
    const lines = content.split('\n');

    let inFrontmatter = false;
    let descriptionLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          break;
        }
      } else if (inFrontmatter && line.startsWith('description:')) {
        descriptionLineIdx = i;
        break;
      }
    }

    if (descriptionLineIdx === -1) return null;

    const descLine = lines[descriptionLineIdx];
    const match = descLine.match(/^(description:\s*)(.*)$/);
    if (!match) return null;

    const [, prefix, desc] = match;
    if (desc.length <= MAX_LENGTH) return null;

    const truncatedDesc = desc.substring(0, MAX_LENGTH - 3) + '...';
    const newDescLine = `${prefix}${truncatedDesc}`;
    const newLines = [...lines];
    newLines[descriptionLineIdx] = newDescLine;

    return {
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      before: lines.join('\n'),
      after: newLines.join('\n'),
      line: descriptionLineIdx + 1
    };
  }

  /**
   * Fix code blocks without language identifier
   */
  private fixCodeBlockLanguage(content: string, result: ValidationResult): FixChange | null {
    const lines = content.split('\n');
    const newLines = [...lines];
    let fixedCount = 0;
    let insideCodeBlock = false;

    // Find code blocks without language - try to detect the language
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        if (!insideCodeBlock) {
          // Opening code block
          insideCodeBlock = true;
          if (!trimmed.match(/^```\w+$/)) {
            // Missing language
            const language = this.detectLanguage(lines, i);
            if (language) {
              newLines[i] = `\`\`\`${language}`;
              fixedCount++;
            }
          }
        } else {
          // Closing code block - don't fix
          insideCodeBlock = false;
        }
      }
    }

    const before = lines.join('\n');
    const after = newLines.join('\n');

    if (before === after) return null;

    return {
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      before,
      after,
      line: fixedCount
    };
  }

  /**
   * Detect language from code content
   */
  private detectLanguage(lines: string[], codeStartIdx: number): string | null {
    // Look at next 10 lines after code block start to detect language
    const lookAhead = lines.slice(codeStartIdx + 1, codeStartIdx + 11);

    const codeSample = lookAhead.join(' ').toLowerCase();

    // Language detection heuristics
    if (codeSample.includes('function ') || codeSample.includes('const ') ||
        codeSample.includes('let ') || codeSample.includes('=>') ||
        codeSample.includes('console.')) {
      return 'javascript';
    }
    if (codeSample.includes('def ') || codeSample.includes('import ') ||
        codeSample.includes('from ') || codeSample.includes(': ')) {
      if (codeSample.includes('self.') || codeSample.includes('__init__')) {
        return 'python';
      }
      return 'python';
    }
    if (codeSample.includes('func ') || codeSample.includes('package ') ||
        codeSample.includes('fmt.') || codeSample.includes(':= ')) {
      return 'go';
    }
    if (codeSample.includes('fn ') || codeSample.includes('let mut') ||
        codeSample.includes('-> ') || codeSample.includes('impl ')) {
      return 'rust';
    }
    if (codeSample.includes('public class') || codeSample.includes('private void') ||
        codeSample.includes('System.out')) {
      return 'java';
    }
    if (codeSample.includes('#!/bin/bash') || codeSample.includes('echo ') ||
        codeSample.includes('export ') || codeSample.includes('if [')) {
      return 'bash';
    }
    if (codeSample.includes('<html') || codeSample.includes('<div') ||
        codeSample.includes('</')) {
      return 'html';
    }
    if (codeSample.includes('css') || codeSample.includes('{') && codeSample.includes(':' ) ||
        codeSample.includes('margin') || codeSample.includes('padding')) {
      return 'css';
    }
    if (codeSample.includes('sql') || codeSample.includes('select ') ||
        codeSample.includes('from ') || codeSample.includes('where ')) {
      return 'sql';
    }
    if (codeSample.includes('json') || codeSample.includes('{"')) {
      return 'json';
    }
    if (codeSample.includes('yaml') || codeSample.includes('---') ||
        codeSample.includes('key:')) {
      return 'yaml';
    }
    if (codeSample.includes('docker') || codeSample.includes('from ') ||
        codeSample.includes('run ')) {
      return 'dockerfile';
    }
    if (codeSample.includes('git') || codeSample.includes('commit') ||
        codeSample.includes('branch')) {
      return 'sh';
    }

    return null;
  }

  /**
   * Fix trailing whitespace
   */
  private fixTrailingWhitespace(content: string, result: ValidationResult): FixChange | null {
    const lines = content.split('\n');
    const newLines = [...lines];
    let firstLine = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/\s+$/)) {
        newLines[i] = lines[i].replace(/\s+$/, '');
        if (firstLine === 0) firstLine = i + 1;
      }
    }

    const before = lines.join('\n');
    const after = newLines.join('\n');

    if (before === after) return null;

    return {
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      before,
      after,
      line: firstLine
    };
  }
}

export const skillFixer = new SkillFixer();