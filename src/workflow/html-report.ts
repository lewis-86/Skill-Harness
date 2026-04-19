import * as fs from 'fs';
import * as path from 'path';

interface CombinedReport {
  timestamp: string;
  inputPath: string;
  summary: {
    total: number;
    lint: { pass: number; fail: number };
    compile: { success: number; fail: number };
    debug: { pass: number; warn: number; fail: number };
    profile: {
      averageScore: number;
      gradeDistribution: Record<string, number>;
    };
  };
  lintReports?: any[];
  debugReports?: any[];
  skills: Array<{
    name: string | null;
    path: string;
    profileGrade: string;
    profileScore: number;
    lintPassed: boolean;
    compileSuccess: boolean;
    debugStatus: string;
    execution?: {
      estimatedTokens?: { total: number; estimatedCost: number };
      timing?: { estimatedExecTimeMs: number; grade: string };
      efficiency?: { overall: number };
    };
  }>;
}

/**
 * Generate HTML report from combined workflow report
 */
export function generateHtmlReport(report: CombinedReport, outputPath: string): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill Harness Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #f8fafc; margin-bottom: 0.5rem; font-size: 1.75rem; }
    h2 { color: #f8fafc; margin: 1.5rem 0 1rem; font-size: 1.25rem; }
    .subtitle { color: #94a3b8; font-size: 0.875rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .card-title { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
    .card-value { font-size: 2rem; font-weight: 700; }
    .grade { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 1.25rem; }
    .grade-a { background: #166534; color: #86efac; }
    .grade-b { background: #1e40af; color: #93c5fd; }
    .grade-c { background: #854d0e; color: #fde047; }
    .grade-d { background: #7c2d12; color: #fdba74; }
    .grade-f { background: #991b1b; color: #fca5a5; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .stat { background: #0f172a; padding: 0.75rem; border-radius: 8px; }
    .stat-label { font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.25rem; font-weight: 600; }
    .stat-value.pass { color: #4ade80; }
    .stat-value.fail { color: #f87171; }
    .stat-value.warn { color: #fbbf24; }
    .progress-bar { background: #0f172a; border-radius: 9999px; height: 8px; overflow: hidden; margin-top: 0.5rem; }
    .progress-fill { height: 100%; border-radius: 9999px; transition: width 0.3s; }
    .progress-fill.a { background: linear-gradient(90deg, #22c55e, #4ade80); }
    .progress-fill.b { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .progress-fill.c { background: linear-gradient(90deg, #eab308, #facc15); }
    .progress-fill.d { background: linear-gradient(90deg, #f97316, #fb923c); }
    .progress-fill.f { background: linear-gradient(90deg, #ef4444, #f87171); }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
    th { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; }
    tr:hover { background: #1e293b; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge.pass { background: #166534; color: #86efac; }
    .badge.fail { background: #991b1b; color: #fca5a5; }
    .badge.warn { background: #854d0e; color: #fde047; }
    .badge.grade { font-size: 0.875rem; padding: 0.25rem 0.75rem; }
    .timestamp { color: #64748b; font-size: 0.75rem; margin-top: 2rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 Skill Harness Report</h1>
    <p class="subtitle">${report.inputPath} • ${report.timestamp}</p>

    <div class="grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Total Skills</span>
        </div>
        <div class="card-value">${report.summary.total}</div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Average Score</span>
          <span class="grade grade-${getGrade(report.summary.profile.averageScore)}">${report.summary.profile.averageScore}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${getGrade(report.summary.profile.averageScore)}" style="width: ${report.summary.profile.averageScore}%"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Lint Results</span>
        </div>
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-label">Pass</div>
            <div class="stat-value pass">${report.summary.lint.pass}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Fail</div>
            <div class="stat-value fail">${report.summary.lint.fail}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Debug Status</span>
        </div>
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-label">Pass</div>
            <div class="stat-value pass">${report.summary.debug.pass}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Warn</div>
            <div class="stat-value warn">${report.summary.debug.warn}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Fail</div>
            <div class="stat-value fail">${report.summary.debug.fail}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Compile</span>
        </div>
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-label">Success</div>
            <div class="stat-value pass">${report.summary.compile.success}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Fail</div>
            <div class="stat-value fail">${report.summary.compile.fail}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Profile Grade Distribution</span>
        </div>
        <div class="stat-grid">
          ${['A', 'B', 'C', 'D', 'F'].map(g => `
          <div class="stat">
            <div class="stat-label">Grade ${g}</div>
            <div class="stat-value">${report.summary.profile.gradeDistribution[g] || 0}</div>
          </div>
          `).join('')}
        </div>
      </div>
    </div>

    <h2>Skill Details</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Skill</th>
            <th>Grade</th>
            <th>Score</th>
            <th>Tokens</th>
            <th>Exec Time</th>
            <th>Efficiency</th>
            <th>Lint</th>
            <th>Compile</th>
            <th>Debug</th>
          </tr>
        </thead>
        <tbody>
          ${report.skills.map(s => {
            const tokens = s.execution?.estimatedTokens?.total || 0;
            const time = s.execution?.timing?.estimatedExecTimeMs || 0;
            const eff = s.execution?.efficiency?.overall || 0;
            const timeGrade = s.execution?.timing?.grade || '-';
            return `
          <tr>
            <td>${s.name ?? 'unknown'}</td>
            <td><span class="badge grade grade-${s.profileGrade.toLowerCase()}">${s.profileGrade}</span></td>
            <td>${s.profileScore}%</td>
            <td>${tokens > 0 ? tokens.toLocaleString() : '-'}</td>
            <td>${time > 0 ? `${time}ms [${timeGrade}]` : '-'}</td>
            <td>${eff > 0 ? `${eff}/100` : '-'}</td>
            <td><span class="badge ${s.lintPassed ? 'pass' : 'fail'}">${s.lintPassed ? 'Pass' : 'Fail'}</span></td>
            <td><span class="badge ${s.compileSuccess ? 'pass' : 'fail'}">${s.compileSuccess ? 'Success' : 'Fail'}</span></td>
            <td><span class="badge ${s.debugStatus === 'pass' ? 'pass' : s.debugStatus === 'warn' ? 'warn' : 'fail'}">${s.debugStatus}</span></td>
          </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>

    <p class="timestamp">Generated by Skill Harness • ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
}

function getGrade(score: number): string {
  if (score >= 90) return 'a';
  if (score >= 80) return 'b';
  if (score >= 70) return 'c';
  if (score >= 60) return 'd';
  return 'f';
}