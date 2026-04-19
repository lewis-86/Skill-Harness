import { skillDebugger } from './debugger';
import * as fs from 'fs';
import * as path from 'path';
import { DebugResult } from './types';

/**
 * Debug directory of skills
 */
function debugDirectory(dirPath: string): DebugResult[] {
  const results: DebugResult[] = [];
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const skillPath = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        results.push(skillDebugger.debug(skillPath));
      }
    } else if (entry.endsWith('.md') && entry.includes('SKILL')) {
      results.push(skillDebugger.debug(fullPath));
    }
  }

  return results;
}

/**
 * Debug CLI
 */
export async function debugCLI(args: string[]) {
  const inputPath = args[0] || 'fixtures/sota-skills-test';

  console.log('🔍 Skill Debugger\n');
  console.log(`Input:  ${inputPath}\n`);

  const stat = fs.statSync(inputPath);
  let results: DebugResult[];

  if (stat.isDirectory()) {
    console.log('📦 Debugging directory...\n');
    results = debugDirectory(inputPath);
  } else {
    console.log('📄 Debugging single skill...\n');
    results = [skillDebugger.debug(inputPath)];
  }

  // Print results
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const result of results) {
    const icon = result.overallStatus === 'pass' ? '✅' :
                 result.overallStatus === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${result.skillName || result.skillPath}`);

    for (const check of result.checks) {
      if (check.status === 'pass') {
        console.log(`   ✓ ${check.name}: ${check.message}`);
      } else if (check.status === 'warn') {
        console.log(`   ⚠ ${check.name}: ${check.message}`);
        if (check.details && check.details.length <= 3) {
          for (const d of check.details) {
            console.log(`     → ${d}`);
          }
        }
      } else if (check.status === 'fail') {
        console.log(`   ✗ ${check.name}: ${check.message}`);
        if (check.details) {
          for (const d of check.details) {
            console.log(`     → ${d}`);
          }
        }
      }
    }

    if (result.overallStatus === 'pass') passCount++;
    else if (result.overallStatus === 'warn') warnCount++;
    else failCount++;

    // Show execution profile if available
    if (result.execution) {
      const exec = result.execution;
      console.log(`   📊 Tokens: ${exec.estimatedTokens?.total ?? 0} ($${exec.estimatedTokens?.estimatedCost ?? 0})`);
      console.log(`   ⏱  Exec Time: ${exec.timing?.estimatedExecTimeMs ?? 0}ms [${exec.timing?.grade ?? '-'}]`);
      console.log(`   ⚡ Efficiency: ${exec.efficiency?.overall ?? 0}/100`);
      if (exec.suggestions.length > 0 && exec.suggestions[0] !== 'Skill is well-optimized for efficient execution') {
        console.log(`   💡 ${exec.suggestions[0]}`);
      }
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Pass:  ${passCount}`);
  console.log(`⚠️  Warn:  ${warnCount}`);
  console.log(`❌ Fail:  ${failCount}`);
  console.log(`═══════════════════════════════════════\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  debugCLI(process.argv.slice(2)).catch(console.error);
}