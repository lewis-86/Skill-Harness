import { skillRuntime, ExecutionResult } from './runtime';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Runtime CLI - execute skills and measure real performance
 */
async function runtimeCLI(args: string[]) {
  const inputPath = args[0] || 'fixtures/sota-skills-test';
  const query = args.find(a => a.startsWith('--query='))?.split('=')[1] ||
    'Analyze code quality and provide suggestions';

  console.log('🔧 Skill Runtime\n');
  console.log(`Input: ${inputPath}`);
  console.log(`Query: "${query}"`);
  console.log('');

  const stat = fs.statSync(inputPath);
  let results: ExecutionResult[];

  if (stat.isDirectory()) {
    results = await executeDirectory(inputPath, query);
  } else {
    results = [await skillRuntime.execute(inputPath)];
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('EXECUTION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let totalTokens = 0;
  let totalCost = 0;
  let totalTime = 0;
  let successCount = 0;

  for (const result of results) {
    if (result.success) successCount++;
    totalTokens += result.metrics.totalTokens;
    totalCost += result.metrics.estimatedCost;
    totalTime += result.metrics.timing.totalMs;

    const status = result.success ? '✅' : '❌';
    const name = result.skillName || path.basename(result.skillPath);
    console.log(`${status} ${name}`);
    console.log(`   Tokens: ${result.metrics.totalTokens.toLocaleString()} | ${result.metrics.timing.totalMs}ms`);
    console.log(`   Cost: $${result.metrics.estimatedCost.toFixed(4)}`);
    console.log(`   Input: ${result.metrics.inputTokens} | Output: ${result.metrics.outputTokens}`);
    console.log('');
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Total Skills: ${results.length} | Success: ${successCount}`);
  console.log(`Total Tokens: ${totalTokens.toLocaleString()}`);
  console.log(`Total Cost: $${totalCost.toFixed(4)}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Avg Tokens/Skill: ${Math.round(totalTokens / results.length)}`);
  console.log(`Avg Cost/Skill: $${(totalCost / results.length).toFixed(4)}`);
  console.log('');
}

async function executeDirectory(dirPath: string, query: string): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const skillPath = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const runtime = new (require('./runtime').SkillRuntime)({ testQuery: query });
        results.push(await runtime.execute(skillPath));
      }
    } else if (entry.endsWith('.md') && entry.includes('SKILL')) {
      const runtime = new (require('./runtime').SkillRuntime)({ testQuery: query });
      results.push(await runtime.execute(fullPath));
    }

    // Progress indicator
    process.stdout.write(`\r  Executed ${results.length} skills...`);
  }
  console.log('');

  return results;
}

// Run if called directly
if (require.main === module) {
  runtimeCLI(process.argv.slice(2)).catch(console.error);
}