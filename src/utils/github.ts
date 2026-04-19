import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

const GITHUB_TEMP_DIR = '/tmp/skill-harness-github';

/**
 * GitHub URL patterns
 */
const GITHUB_PATTERNS = [
  /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/,
  /^git@github\.com:([^\/]+)\/([^\/]+)\.git$/,
  /^([^\/]+)\/([^\/]+)$/
];

/**
 * Parse GitHub URL or shorthand
 */
export function parseGitHubInput(input: string): { owner: string; repo: string } | null {
  for (const pattern of GITHUB_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }
  return null;
}

/**
 * Clone a GitHub repository to temp directory
 */
export function cloneGitHubRepo(input: string): string {
  const parsed = parseGitHubInput(input);
  if (!parsed) {
    throw new Error(`Invalid GitHub input: ${input}`);
  }

  const { owner, repo } = parsed;
  const repoDir = path.join(GITHUB_TEMP_DIR, `${owner}-${repo}-${Date.now()}`);

  // Create temp directory
  fs.mkdirSync(repoDir, { recursive: true });

  // Clone using git
  const gitUrl = `https://github.com/${owner}/${repo}.git`;
  console.log(`📦 Cloning ${gitUrl}...`);

  try {
    execSync(`git clone --depth 1 ${gitUrl} "${repoDir}"`, { stdio: 'pipe' });
    console.log(`✅ Cloned to ${repoDir}`);
    return repoDir;
  } catch (e) {
    // Clean up on failure
    fs.rmSync(repoDir, { recursive: true, force: true });
    throw new Error(`Failed to clone ${gitUrl}: ${e}`);
  }
}

/**
 * Check if input is a GitHub URL or shorthand
 */
export function isGitHubInput(input: string): boolean {
  // If it's an absolute path or relative path that exists, it's not GitHub
  if (path.isAbsolute(input) || input.startsWith('./') || input.startsWith('../')) {
    return false;
  }
  // If it's a URL with github.com, it's GitHub
  if (input.includes('github.com')) {
    return true;
  }
  // If it matches GitHub shorthand and is NOT an existing local directory, it's GitHub
  const parsed = parseGitHubInput(input);
  if (parsed) {
    // Check if it looks like a local path (contains /)
    return !input.includes('/') || !fs.existsSync(input);
  }
  return false;
}

/**
 * Fetch single file from GitHub
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Skill-Harness' } }, res => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

/**
 * Clean up temp GitHub directories
 */
export function cleanupTempDirs(): void {
  if (fs.existsSync(GITHUB_TEMP_DIR)) {
    fs.rmSync(GITHUB_TEMP_DIR, { recursive: true, force: true });
    console.log('🧹 Cleaned up temp GitHub directories');
  }
}