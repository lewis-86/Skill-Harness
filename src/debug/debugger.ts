import * as fs from 'fs';
import * as path from 'path';
import { parseSkill } from '../lint/core/parser';
import {
  DebugResult,
  DebugCheck,
  ReferenceDebug,
  ScriptDebug,
  DebugContentAnalysis,
  ExecutionProfile,
  TokenEstimate,
  TimingAnalysis,
  EfficiencyScore,
  RuntimeMetrics
} from './types';

/**
 * Skill Debugger
 * Validates and analyzes skill files for potential issues
 */
export class SkillDebugger {
  /**
   * Debug a skill file
   */
  debug(skillPath: string): DebugResult {
    const checks: DebugCheck[] = [];
    const skillDir = path.dirname(skillPath);

    // Read skill content
    let content: string;
    try {
      content = fs.readFileSync(skillPath, 'utf-8');
    } catch (e) {
      return {
        skillPath,
        skillName: null,
        timestamp: new Date().toISOString(),
        checks: [{
          name: 'file-read',
          status: 'fail',
          message: `Cannot read skill file: ${skillPath}`
        }],
        overallStatus: 'fail'
      };
    }

    // Parse skill
    const parsed = parseSkill(content);
    parsed.skillPath = skillPath;

    // Run debug checks
    checks.push(this.checkFrontmatter(parsed));
    checks.push(...this.checkReferences(content, skillDir));
    checks.push(...this.checkScripts(content, skillDir));
    checks.push(this.checkContentStructure(parsed));
    checks.push(this.checkMetadata(parsed));

    // Determine overall status
    const hasFail = checks.some(c => c.status === 'fail');
    const hasWarn = checks.some(c => c.status === 'warn');
    const overallStatus = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

    // Add execution profiling
    const execution = this.profileExecution(parsed, content);

    return {
      skillPath,
      skillName: parsed.frontmatter?.name || null,
      timestamp: new Date().toISOString(),
      checks,
      overallStatus,
      execution
    };
  }

  /**
   * Profile skill execution efficiency
   */
  private profileExecution(parsed: ReturnType<typeof parseSkill>, content: string): ExecutionProfile {
    // Try to get real metrics from runtime
    let runtimeMetrics: RuntimeMetrics | undefined;

    try {
      // Dynamic import to avoid circular dependency
      const { SkillRuntime } = require('../runtime/runtime');
      const runtime = new SkillRuntime({ testQuery: 'Execute this skill' });
      // Note: This is sync for now, runtime.execute returns a promise
    } catch (e) {
      // Runtime not available, use estimates
    }

    const tokenEstimate = this.estimateTokens(parsed, content);
    const timing = this.estimateTiming(parsed, content, tokenEstimate);
    const efficiency = this.calculateEfficiency(tokenEstimate, timing, parsed);
    const suggestions = this.generateOptimizationSuggestions(parsed, tokenEstimate, timing, efficiency);

    return {
      runtime: runtimeMetrics,
      estimatedTokens: tokenEstimate,
      timing,
      efficiency,
      suggestions
    };
  }

  /**
   * Estimate token count for skill
   */
  private estimateTokens(parsed: ReturnType<typeof parseSkill>, content: string): TokenEstimate {
    const fm = parsed.frontmatter;
    const lines = content.split('\n');

    // Frontmatter tokens
    const frontmatterTokens = fm ? Math.ceil(fm.name?.length || 0 / 4) + Math.ceil(fm.description?.length || 0 / 4) : 0;

    // Description tokens (for trigger matching)
    const descriptionTokens = fm?.description ? Math.ceil(fm.description.length / 4) : 0;

    // Content tokens (words * 1.3 for token ratio)
    const wordCount = content.split(/\s+/).length;
    const contentTokens = Math.ceil(wordCount * 1.3);

    // Code block tokens (more expensive - 1.5x)
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).join('\n');
    const codeTokens = Math.ceil(codeBlocks.split(/\s+/).length * 1.5);

    const total = frontmatterTokens + descriptionTokens + contentTokens + codeTokens;

    // Cost at GPT-4 rate: $0.003/1K tokens
    const estimatedCost = (total / 1000) * 0.003;

    return {
      total,
      breakdown: {
        frontmatter: frontmatterTokens,
        description: descriptionTokens,
        content: contentTokens,
        codeBlocks: codeTokens
      },
      estimatedCost: Math.round(estimatedCost * 10000) / 10000 // 4 decimal places
    };
  }

  /**
   * Estimate execution timing
   */
  private estimateTiming(parsed: ReturnType<typeof parseSkill>, content: string, tokens: TokenEstimate): TimingAnalysis {
    const lines = content.split('\n').length;

    // Parsing: ~1ms per 100 lines
    const parsing = Math.ceil(lines / 100);

    // Trigger matching: depends on description length, ~0.5ms
    const triggerMatch = Math.ceil((parsed.frontmatter?.description?.length || 0) / 200);

    // Context prep: token processing, ~0.1ms per 100 tokens
    const contextPrep = Math.ceil(tokens.total / 1000) * 0.1;

    // Response generation: proportional to output complexity, ~10-50ms
    const responseGen = 20 + Math.ceil(lines / 10);

    const estimatedExecTimeMs = parsing + triggerMatch + contextPrep + responseGen;

    // Performance grade based on expected response time
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (estimatedExecTimeMs < 50) grade = 'A';
    else if (estimatedExecTimeMs < 100) grade = 'B';
    else if (estimatedExecTimeMs < 200) grade = 'C';
    else if (estimatedExecTimeMs < 500) grade = 'D';
    else grade = 'F';

    return {
      parseTimeMs: parsing,
      estimatedExecTimeMs: Math.round(estimatedExecTimeMs),
      breakdown: {
        parsing: Math.round(parsing * 10) / 10,
        triggerMatch: Math.round(triggerMatch * 10) / 10,
        contextPrep: Math.round(contextPrep * 10) / 10,
        responseGen: Math.round(responseGen * 10) / 10
      },
      grade
    };
  }

  /**
   * Calculate efficiency scores
   */
  private calculateEfficiency(tokens: TokenEstimate, timing: TimingAnalysis, parsed: ReturnType<typeof parseSkill>): EfficiencyScore {
    const lines = parsed.content.split('\n').length;

    // Token efficiency: fewer tokens per line = better
    // Good: >50 tokens/line, Fair: 30-50, Poor: <30
    const tokensPerLine = tokens.total / Math.max(lines, 1);
    let tokenEfficiency: number;
    if (tokensPerLine > 50) tokenEfficiency = 100;
    else if (tokensPerLine > 30) tokenEfficiency = 70;
    else if (tokensPerLine > 15) tokenEfficiency = 50;
    else tokenEfficiency = 30;

    // Time efficiency: faster = better
    // A: <50ms (100), B: <100ms (80), C: <200ms (60), D: <500ms (40), F: >500ms (20)
    let timeEfficiency: number;
    if (timing.estimatedExecTimeMs < 50) timeEfficiency = 100;
    else if (timing.estimatedExecTimeMs < 100) timeEfficiency = 80;
    else if (timing.estimatedExecTimeMs < 200) timeEfficiency = 60;
    else if (timing.estimatedExecTimeMs < 500) timeEfficiency = 40;
    else timeEfficiency = 20;

    // Complexity score: balanced content = better
    const headings = (parsed.content.match(/^#+\s/gm) || []).length;
    const codeBlocks = (parsed.content.match(/```/g) || []).length;
    const lists = (parsed.content.match(/^[-*+]\s/gm) || []).length;
    const complexityScore = Math.min(100, Math.round((headings * 5 + codeBlocks * 8 + lists * 3)));

    // Overall: weighted average
    const overall = Math.round(
      tokenEfficiency * 0.3 +
      timeEfficiency * 0.4 +
      complexityScore * 0.3
    );

    return {
      overall,
      tokenEfficiency,
      timeEfficiency,
      complexityScore
    };
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    parsed: ReturnType<typeof parseSkill>,
    tokens: TokenEstimate,
    timing: TimingAnalysis,
    efficiency: EfficiencyScore
  ): string[] {
    const suggestions: string[] = [];
    const fm = parsed.frontmatter;
    const content = parsed.content;

    // Token suggestions
    if (tokens.breakdown.codeBlocks > tokens.total * 0.5) {
      suggestions.push('Code blocks exceed 50% of content - consider reducing or summarizing code');
    }

    if (fm?.description && fm.description.length > 500) {
      suggestions.push('Description is very long (>500 chars) - consider shortening for faster trigger matching');
    }

    // Timing suggestions
    if (timing.grade === 'D' || timing.grade === 'F') {
      suggestions.push('Execution time is high - consider simplifying the response structure');
    }

    if (timing.breakdown.responseGen > 50) {
      suggestions.push('Response generation is slow - break into smaller sections with clear headers');
    }

    // Efficiency suggestions
    if (efficiency.complexityScore < 30) {
      suggestions.push('Content lacks structure - add more headings, code examples, or lists');
    }

    if (efficiency.tokenEfficiency < 50) {
      suggestions.push('High token usage per line - consider more concise formatting');
    }

    // Content quality suggestions
    const headings = (content.match(/^#+\s/gm) || []).length;
    if (headings < 3) {
      suggestions.push('Add more section headers to improve readability and parsing');
    }

    const codeBlocks = (content.match(/```/g) || []).length;
    if (codeBlocks === 0) {
      suggestions.push('No code examples found - consider adding relevant code samples');
    }

    if (suggestions.length === 0) {
      suggestions.push('Skill is well-optimized for efficient execution');
    }

    return suggestions;
  }

  /**
   * Check frontmatter validity
   */
  private checkFrontmatter(parsed: ReturnType<typeof parseSkill>): DebugCheck {
    if (!parsed.hasFrontmatter) {
      return {
        name: 'frontmatter',
        status: 'fail',
        message: 'Frontmatter is missing or malformed'
      };
    }

    if (!parsed.frontmatter) {
      return {
        name: 'frontmatter',
        status: 'fail',
        message: 'Frontmatter could not be parsed'
      };
    }

    const fm = parsed.frontmatter;
    const issues: string[] = [];

    if (!fm.name) issues.push('name is missing');
    if (!fm.description) issues.push('description is missing');

    if (issues.length > 0) {
      return {
        name: 'frontmatter',
        status: 'fail',
        message: `Missing required fields: ${issues.join(', ')}`
      };
    }

    return {
      name: 'frontmatter',
      status: 'pass',
      message: 'Frontmatter is valid'
    };
  }

  /**
   * Check all references in content
   */
  private checkReferences(content: string, baseDir: string): DebugCheck[] {
    const checks: DebugCheck[] = [];
    const refs = this.extractReferences(content, baseDir);

    if (refs.length === 0) {
      checks.push({
        name: 'references',
        status: 'skip',
        message: 'No references found in content'
      });
      return checks;
    }

    const missing = refs.filter(r => !r.exists);
    const accessible = refs.filter(r => r.exists);

    if (missing.length === refs.length) {
      checks.push({
        name: 'references',
        status: 'fail',
        message: `All ${refs.length} references are missing`,
        details: refs.map(r => `${r.type}: ${r.path}`)
      });
    } else if (missing.length > 0) {
      checks.push({
        name: 'references',
        status: 'warn',
        message: `${missing.length}/${refs.length} references are missing`,
        details: missing.map(r => `${r.type}: ${r.path}`)
      });
    } else {
      checks.push({
        name: 'references',
        status: 'pass',
        message: `All ${refs.length} references are accessible`
      });
    }

    // Check for potentially broken URLs
    const urlRefs = refs.filter(r => r.type === 'url');
    if (urlRefs.length > 0) {
      checks.push({
        name: 'url-references',
        status: 'warn',
        message: `Contains ${urlRefs.length} external URL references (cannot validate)`,
        details: urlRefs.slice(0, 5).map(r => r.path)
      });
    }

    return checks;
  }

  /**
   * Check scripts in content
   */
  private checkScripts(content: string, baseDir: string): DebugCheck[] {
    const checks: DebugCheck[] = [];
    const scriptPattern = /```(\w+)\n[\s\S]*?```/g;
    const inlineScripts: ScriptDebug[] = [];

    let match;
    while ((match = scriptPattern.exec(content)) !== null) {
      const lang = match[1].toLowerCase();
      const code = match[0];
      const lines = code.split('\n').length - 2;

      inlineScripts.push({
        path: `<inline:${lang}>`,
        language: lang,
        syntaxValid: true, // Would need language-specific parser
        lines
      });
    }

    // Check referenced scripts
    const scriptRefPattern = /scripts\/[\w-]+\.(\w+)/g;
    const scriptRefs: ScriptDebug[] = [];
    let refMatch;

    while ((refMatch = scriptRefPattern.exec(content)) !== null) {
      const scriptPath = path.resolve(baseDir, refMatch[0]);
      if (fs.existsSync(scriptPath)) {
        const ext = refMatch[1].toLowerCase();
        const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
        scriptRefs.push({
          path: refMatch[0],
          language: this.getLanguageFromExt(ext),
          syntaxValid: true,
          lines: scriptContent.split('\n').length
        });
      }
    }

    const totalScripts = inlineScripts.length + scriptRefs.length;

    if (totalScripts === 0) {
      checks.push({
        name: 'scripts',
        status: 'skip',
        message: 'No scripts found in content'
      });
    } else {
      checks.push({
        name: 'scripts',
        status: 'pass',
        message: `Found ${inlineScripts.length} inline scripts, ${scriptRefs.length} referenced scripts`
      });
    }

    return checks;
  }

  /**
   * Check content structure
   */
  private checkContentStructure(parsed: ReturnType<typeof parseSkill>): DebugCheck {
    const content = parsed.content;
    const lines = content.split('\n');

    const analysis: DebugContentAnalysis = {
      totalLines: lines.length,
      codeBlocks: (content.match(/```[\s\S]*?```/g) || []).length,
      headings: (content.match(/^#{1,6}\s/gm) || []).length,
      listItems: (content.match(/^[\s]*[-*+]\s/gm) || []).length,
      links: (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
      images: (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length,
      commands: this.extractCommands(content),
      potentialTriggers: this.extractTriggers(content)
    };

    const issues: string[] = [];

    if (analysis.headings === 0) {
      issues.push('no headings found');
    }

    if (analysis.codeBlocks > 0 && analysis.codeBlocks < 2) {
      issues.push('only one code block - may need more examples');
    }

    if (analysis.listItems < 3) {
      issues.push('few list items - content may lack structure');
    }

    if (issues.length > 0) {
      return {
        name: 'content-structure',
        status: 'warn',
        message: `Content structure issues: ${issues.join(', ')}`,
        details: [
          `Lines: ${analysis.totalLines}`,
          `Headings: ${analysis.headings}`,
          `Code blocks: ${analysis.codeBlocks}`,
          `Lists: ${analysis.listItems}`,
          `Commands: ${analysis.commands.length}`,
          `Triggers: ${analysis.potentialTriggers.length}`
        ]
      };
    }

    return {
      name: 'content-structure',
      status: 'pass',
      message: `Content structure is well-formed (${analysis.totalLines} lines)`
    };
  }

  /**
   * Check metadata completeness
   */
  private checkMetadata(parsed: ReturnType<typeof parseSkill>): DebugCheck {
    const fm = parsed.frontmatter;
    if (!fm) {
      return {
        name: 'metadata',
        status: 'skip',
        message: 'No frontmatter to check'
      };
    }

    const missing: string[] = [];
    const recommended = ['license', 'author', 'tags', 'version'];

    for (const field of recommended) {
      if (!fm[field as keyof typeof fm] && !fm.metadata?.[field]) {
        missing.push(field);
      }
    }

    if (missing.length === 0) {
      return {
        name: 'metadata',
        status: 'pass',
        message: 'Metadata is complete'
      };
    }

    return {
      name: 'metadata',
      status: 'warn',
      message: `Missing recommended metadata: ${missing.join(', ')}`
    };
  }

  /**
   * Extract references from content
   */
  private extractReferences(content: string, baseDir: string): ReferenceDebug[] {
    const refs: ReferenceDebug[] = [];
    const patterns = [
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'markdown' as const },
      { regex: /scripts\/[\w-]+\.\w+/g, type: 'script' as const },
      { regex: /templates?\/[\w-]+\.\w+/g, type: 'template' as const },
      { regex: /!\[([^\]]*)\]\(([^)]+)\)/g, type: 'image' as const }
    ];

    const seen = new Set<string>();

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const pathStr = match[2] || match[0];
        if (seen.has(pathStr)) continue;
        seen.add(pathStr);

        const isUrl = pathStr.startsWith('http://') || pathStr.startsWith('https://');
        const resolved = isUrl ? pathStr : path.resolve(baseDir, pathStr);
        const exists = isUrl || fs.existsSync(resolved);

        refs.push({
          path: pathStr,
          type: isUrl ? 'url' : type,
          exists,
          accessible: exists,
          resolvedPath: resolved,
          size: !isUrl && exists ? fs.statSync(resolved).size : undefined
        });
      }
    }

    return refs;
  }

  /**
   * Extract potential commands from content
   */
  private extractCommands(content: string): string[] {
    const commands: string[] = [];
    const pattern = /`(claude|agent|skill)[\s][^`]+`/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      commands.push(match[0]);
    }

    return [...new Set(commands)].slice(0, 10);
  }

  /**
   * Extract potential trigger phrases
   */
  private extractTriggers(content: string): string[] {
    const triggers: string[] = [];
    const patterns = [
      /use\s+(when|this|it)/gi,
      /trigger(s|ed)?\s+on/gi,
      /activat(e|es|ed)\s+(when|on)/gi,
      /when\s+(the\s+)?user/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        triggers.push(match[0]);
      }
    }

    return [...new Set(triggers)].slice(0, 20);
  }

  /**
   * Get language from extension
   */
  private getLanguageFromExt(ext: string): string {
    const map: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      sh: 'bash',
      bash: 'bash',
      rb: 'ruby',
      go: 'go'
    };
    return map[ext.toLowerCase()] || ext;
  }
}

export const skillDebugger = new SkillDebugger();