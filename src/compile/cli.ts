import { skillCompiler } from './compiler';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Compile CLI
 */
export async function compileCLI(args: string[]) {
  const inputPath = args[0] || 'fixtures/sota-skills-test';
  const outputDir = args[1] || 'fixtures/compiled';

  console.log('🔧 Skill Compiler\n');
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputDir}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stat = fs.statSync(inputPath);
  let results;

  if (stat.isDirectory()) {
    console.log('📦 Compiling directory...\n');
    results = skillCompiler.compileDirectory(inputPath);
  } else {
    console.log('📄 Compiling single skill...\n');
    results = [skillCompiler.compile(inputPath)];
  }

  // Print results
  let successCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount++;
      console.log(`✅ ${result.skillName || result.skillPath}`);

      // Write manifest
      if (result.manifest) {
        const safeName = (result.manifest.name || 'unknown').replace(/[^a-z0-9-]/gi, '-');
        const manifestPath = path.join(outputDir, `${safeName}.manifest.json`);
        fs.writeFileSync(manifestPath, JSON.stringify(result.manifest, null, 2));
        console.log(`   → ${manifestPath}`);
      }
    } else {
      failCount++;
      console.log(`❌ ${result.skillName || result.skillPath}`);
      for (const err of result.errors) {
        console.log(`   [${err.code}] ${err.message}`);
      }
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Compiled: ${successCount}`);
  console.log(`❌ Failed:   ${failCount}`);
  console.log(`═══════════════════════════════════════\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  compileCLI(process.argv.slice(2)).catch(console.error);
}