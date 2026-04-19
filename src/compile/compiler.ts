import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parseSkill } from '../lint/core/parser';
import {
  CompileResult,
  CompileError,
  CompileWarning,
  SkillManifest,
  ResolvedReference,
  ResolvedScript
} from './types';

/**
 * Skill Compiler
 * Compiles SKILL.md into a validated, portable bundle
 */
export class SkillCompiler {
  /**
   * Compile a skill file or directory
   */
  compile(skillPath: string): CompileResult {
    const errors: CompileError[] = [];
    const warnings: CompileWarning[] = [];

    // Read skill content
    let content: string;
    try {
      content = fs.readFileSync(skillPath, 'utf-8');
    } catch (e) {
      return {
        skillPath,
        skillName: null,
        success: false,
        manifest: null,
        errors: [{ code: 'E001', message: `Cannot read skill file: ${skillPath}` }],
        warnings: [],
        timestamp: new Date().toISOString()
      };
    }

    // Parse skill
    const parsed = parseSkill(content);
    parsed.skillPath = skillPath;

    // Validate basic structure
    if (!parsed.hasFrontmatter) {
      errors.push({ code: 'E101', message: 'Missing frontmatter (--- markers)' });
    }

    // Extract and resolve references
    const references = this.extractReferences(content, path.dirname(skillPath));
    const missingRefs = references.filter(r => !r.exists);
    if (missingRefs.length > 0) {
      errors.push({
        code: 'E102',
        message: `Missing references: ${missingRefs.map(r => r.original).join(', ')}`
      });
    }

    // Extract scripts
    const scripts = this.extractScripts(content, path.dirname(skillPath));

    // Generate manifest if no critical errors
    let manifest: SkillManifest | null = null;
    if (errors.length === 0) {
      const fm = parsed.frontmatter;
      manifest = {
        name: fm?.name || 'unknown',
        description: fm?.description || '',
        version: '1.0.0',
        schemaVersion: '1.0',
        metadata: {
          author: fm?.author || fm?.metadata?.author,
          license: fm?.license,
          tags: fm?.tags,
          createdAt: fm?.createdAt || fm?.metadata?.createdAt,
          updatedAt: fm?.updatedAt || fm?.metadata?.updatedAt,
          runtime: fm?.runtime
        },
        content: parsed.content,
        references,
        scripts,
        checksum: this.generateChecksum(content)
      };
    }

    // Check for warnings
    if (references.length > 10) {
      warnings.push({
        code: 'W001',
        message: `Skill has ${references.length} references - consider bundling dependencies`
      });
    }

    return {
      skillPath,
      skillName: parsed.frontmatter?.name || null,
      success: errors.length === 0,
      manifest,
      errors,
      warnings,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Compile multiple skills from a directory
   */
  compileDirectory(dirPath: string): CompileResult[] {
    const results: CompileResult[] = [];
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Look for SKILL.md in directory
        const skillPath = path.join(fullPath, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          results.push(this.compile(skillPath));
        }
      } else if (entry.endsWith('.md') && entry.includes('SKILL')) {
        results.push(this.compile(fullPath));
      }
    }

    return results;
  }

  /**
   * Extract references from content
   */
  private extractReferences(content: string, baseDir: string): ResolvedReference[] {
    const references: ResolvedReference[] = [];
    const patterns = [
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'markdown' as const },
      { regex: /scripts\/[\w-]+\.\w+/g, type: 'script' as const },
      { regex: /\.\.\/[\w-]+/g, type: 'data' as const },
      { regex: /templates?\/[\w-]+\.\w+/g, type: 'template' as const }
    ];

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const original = match[1] || match[0];
        const resolved = path.resolve(baseDir, original);
        const exists = fs.existsSync(resolved);

        // Avoid duplicates
        if (!references.find(r => r.original === original)) {
          references.push({ original, resolved, type, exists });
        }
      }
    }

    return references;
  }

  /**
   * Extract scripts from content
   */
  private extractScripts(content: string, baseDir: string): ResolvedScript[] {
    const scripts: ResolvedScript[] = [];
    const scriptPattern = /scripts\/[\w-]+\.(\w+)/g;

    let match;
    while ((match = scriptPattern.exec(content)) !== null) {
      const scriptPath = path.resolve(baseDir, match[0]);
      if (fs.existsSync(scriptPath)) {
        const ext = match[1];
        const lang = this.getLanguageFromExt(ext);
        scripts.push({
          path: match[0],
          content: fs.readFileSync(scriptPath, 'utf-8'),
          language: lang
        });
      }
    }

    return scripts;
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExt(ext: string): string {
    const map: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      sh: 'bash',
      bash: 'bash',
      zsh: 'zsh',
      ps1: 'powershell',
      rb: 'ruby',
      go: 'go'
    };
    return map[ext.toLowerCase()] || ext;
  }

  /**
   * Generate checksum for content
   */
  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

export const skillCompiler = new SkillCompiler();