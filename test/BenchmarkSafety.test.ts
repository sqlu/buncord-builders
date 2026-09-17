import { expect, it } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

it('keeps the generated benchmark SVG synchronized with the curated README', () => {
  const directory = mkdtempSync(join(tmpdir(), 'BuncordBenchmarkTest-'));
  const readme = '# Curated README\n\n## Benchmarks\n\nKeep this section.\n\n## Component Architecture\n\nKeep this too.\n';
  try {
    mkdirSync(join(directory, 'assets'));
    writeFileSync(join(directory, 'assets/logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    writeFileSync(join(directory, 'README.md'), readme);
    const result = Bun.spawnSync([
      process.execPath, resolve(import.meta.dir, '../scripts/run-benchmark.ts'),
      '--iterations=5', '--trials=1', '--warmup=1',
    ], { cwd: directory, env: { ...process.env, CI: 'true' }, stdout: 'pipe', stderr: 'pipe' });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(join(directory, 'README.md'), 'utf8');
    expect(updated).toStartWith('# Curated README\n\n## Benchmarks');
    expect(updated).toEndWith('## Component Architecture\n\nKeep this too.\n');
    expect(updated).not.toContain('Keep this section.');
    expect(updated).toContain('JSON.stringify()');
    expect(updated).toContain('10 rows');

    const stdout = new TextDecoder().decode(result.stdout);
    const measuredCombined = [...stdout.matchAll(/^\s+combined: ([\d.]+) ms median/gm)]
      .map(match => Number(match[1]));
    const svg = readFileSync(join(directory, 'assets/benchmark.svg'), 'utf8');
    const displayedCombined = [...svg.matchAll(/class="value [^"]+"[^>]*>([\d.]+)<\/text>/g)]
      .slice(-2)
      .map(match => Number(match[1]));

    expect(measuredCombined).toHaveLength(2);
    expect(displayedCombined).toHaveLength(2);
    expect(Math.abs(displayedCombined[0]! - measuredCombined[0]!)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(displayedCombined[1]! - measuredCombined[1]!)).toBeLessThanOrEqual(0.06);
    expect(updated).toMatch(/!\[Benchmark chart\]\(\.\/assets\/benchmark\.svg\?v=[a-z0-9]+\)/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
