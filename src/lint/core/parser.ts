import * as yaml from 'js-yaml';
import { ParsedSkill, SkillFrontmatter } from './types';

/**
 * Parse a SKILL.md file into its components
 */
export function parseSkill(content: string): ParsedSkill {
  const lines = content.split('\n');

  // Find frontmatter markers
  const firstDashIndex = lines.findIndex(line => line.trim() === '---');

  if (firstDashIndex === -1) {
    return {
      frontmatter: null,
      frontmatterRaw: '',
      content: content,
      hasFrontmatter: false,
      frontmatterStartLine: -1,
      frontmatterEndLine: -1
    };
  }

  // Find closing ---
  let secondDashIndex = -1;
  for (let i = firstDashIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      secondDashIndex = i;
      break;
    }
  }

  if (secondDashIndex === -1) {
    return {
      frontmatter: null,
      frontmatterRaw: lines.slice(firstDashIndex).join('\n'),
      content: content,
      hasFrontmatter: false,
      frontmatterStartLine: firstDashIndex,
      frontmatterEndLine: -1
    };
  }

  // Extract frontmatter content
  const frontmatterRaw = lines.slice(firstDashIndex + 1, secondDashIndex).join('\n');

  // Extract body content
  const bodyLines = lines.slice(secondDashIndex + 1);
  // Skip leading blank lines
  let bodyStart = 0;
  while (bodyStart < bodyLines.length && bodyLines[bodyStart].trim() === '') {
    bodyStart++;
  }
  const bodyContent = bodyLines.slice(bodyStart).join('\n');

  // Parse YAML
  let frontmatter: SkillFrontmatter | null = null;
  try {
    const parsed = yaml.load(frontmatterRaw);
    if (typeof parsed === 'object' && parsed !== null) {
      frontmatter = parsed as SkillFrontmatter;
    }
  } catch (e) {
    // YAML parse error - will be handled by other rules
    frontmatter = null;
  }

  return {
    frontmatter,
    frontmatterRaw,
    content: bodyContent,
    hasFrontmatter: true,
    frontmatterStartLine: firstDashIndex,
    frontmatterEndLine: secondDashIndex
  };
}

/**
 * Read and parse a skill file
 */
export async function parseSkillFile(filePath: string): Promise<ParsedSkill> {
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseSkill(content);
}
