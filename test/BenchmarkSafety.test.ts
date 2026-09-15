import { expect, it } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

it('updates only the benchmark section of the curated README in CI', () => {
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
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
