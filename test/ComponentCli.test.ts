import { describe, expect, it, spyOn } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runComponentCli, type ComponentCliIO } from '../src/cli/ComponentCli.ts';

function createIO(files: Record<string, string> = {}, stdin = '', color = false): {
  io: ComponentCliIO;
  stdout: string[];
  stderr: string[];
  written: Record<string, string>;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const written: Record<string, string> = {};
  return {
    stdout,
    stderr,
    written,
    io: {
      readFile: async path => {
        const value = files[path];
        if (value === undefined) throw new Error(`ENOENT: ${path}`);
        return value;
      },
      readStdin: async () => stdin,
      writeFile: async (path, value) => { written[path] = value; },
      stdout: value => { stdout.push(value); },
      stderr: value => { stderr.push(value); },
      color,
    },
  };
}

describe('component CLI', () => {
  it('validates a payload read from a file', async () => {
    const state = createIO({
      'button.json': JSON.stringify({ type: 2, style: 1, custom_id: 'ok', label: 'OK' }),
    });

    expect(await runComponentCli(['validate', 'button.json'], state.io)).toBe(0);
    expect(state.stdout.join('')).toContain('Valid Discord component payload');
    expect(state.stderr).toEqual([]);
  });

  it('explains every structured validation issue with a path and fix', async () => {
    const state = createIO({}, JSON.stringify({ type: 2, style: 5, custom_id: 'bad' }));

    expect(await runComponentCli(['explain', '-', '--context', 'message'], state.io)).toBe(1);
    const output = state.stdout.join('');
    expect(output).toContain('LINK_BUTTON_MISSING_URL');
    // A root issue is on the payload itself, so it carries no location suffix.
    expect(output).not.toContain('(root)');
    expect(output).not.toContain(' at ');
    expect(output).toContain('Fix:');
  });

  it('provides machine-readable validation output', async () => {
    const state = createIO({}, JSON.stringify({ type: 10, content: 'Hello' }));

    expect(await runComponentCli(['validate', '--json'], state.io)).toBe(0);
    expect(JSON.parse(state.stdout.join(''))).toEqual({
      valid: true,
      errors: 0,
      warnings: 0,
      issues: [],
    });
  });

  it('summarizes invalid payloads in human-readable mode', async () => {
    const state = createIO({}, JSON.stringify({ type: 2, style: 5, custom_id: 'bad' }));

    expect(await runComponentCli(['validate'], state.io)).toBe(1);
    expect(state.stdout.join('')).toContain('Invalid Discord component payload');
    expect(state.stdout.join('')).toContain('LINK_BUTTON_MISSING_URL');
  });

  it('generates TypeScript to stdout or a file', async () => {
    const source = JSON.stringify({ type: 10, content: 'Hello' });
    const stdoutState = createIO({}, source);
    expect(await runComponentCli(['generate', '-', '--name', 'greeting'], stdoutState.io)).toBe(0);
    expect(stdoutState.stdout.join('')).toContain('export const greeting = new TextDisplayBuilder({');

    const fileState = createIO({ 'input.json': source });
    expect(await runComponentCli(['generate', 'input.json', '--output', 'Generated.ts'], fileState.io)).toBe(0);
    expect(fileState.written['Generated.ts']).toContain('new TextDisplayBuilder({');
  });

  it('points at nested issues and leaves root issues unqualified', async () => {
    // Mixing a button and a select produces a root issue and a nested one.
    const nested = JSON.stringify({
      type: 1,
      components: [
        { type: 2, style: 5, url: 'https://bun.sh', custom_id: 'oops', label: 'Docs' },
        { type: 3, custom_id: 'pick', options: [{ label: 'A', value: 'a' }] },
      ],
    });
    const state = createIO({}, nested);
    expect(await runComponentCli(['explain', '-'], state.io)).toBe(1);

    const output = state.stdout.join('');
    expect(output).toContain('LINK_BUTTON_HAS_CUSTOM_ID at components[0]');
    expect(output).toContain('ACTION_ROW_MIXED_COMPONENTS\n');
  });

  it('tells validate users where to get the details', async () => {
    const state = createIO({}, JSON.stringify({ type: 2, style: 5, custom_id: 'bad' }));
    expect(await runComponentCli(['validate', '-'], state.io)).toBe(1);

    const output = state.stdout.join('');
    expect(output).toContain('✗ Invalid Discord component payload: 3 errors.');
    expect(output).toContain('Run the same input through "explain"');
  });

  it('emits ANSI colour only when the caller asks for it', async () => {
    const payload = JSON.stringify({ type: 2, style: 5, custom_id: 'bad' });

    const plain = createIO({}, payload);
    await runComponentCli(['explain', '-'], plain.io);
    expect(plain.stdout.join('')).not.toContain('\u001B[');

    const coloured = createIO({}, payload, true);
    await runComponentCli(['explain', '-'], coloured.io);
    const output = coloured.stdout.join('');
    expect(output).toContain('\u001B[31m');
    // The text itself is unchanged once the codes are stripped.
    expect(output.replaceAll(/\u001B\[\d+m/g, '')).toBe(plain.stdout.join(''));
  });

  it('lets --color and --no-color override the detected default', async () => {
    const payload = JSON.stringify({ type: 2, style: 5, custom_id: 'bad' });

    // Detection says no, the flag says yes.
    const forced = createIO({}, payload);
    await runComponentCli(['explain', '-', '--color'], forced.io);
    expect(forced.stdout.join('')).toContain('\u001B[31m');

    // Detection says yes, the flag says no.
    const suppressed = createIO({}, payload, true);
    await runComponentCli(['explain', '-', '--no-color'], suppressed.io);
    expect(suppressed.stdout.join('')).not.toContain('\u001B[');
  });

  it('treats a missing command as a usage error, not as help', async () => {
    const bare = createIO();
    expect(await runComponentCli([], bare.io)).toBe(2);
    expect(bare.stderr.join('')).toContain('No command given.');
    expect(bare.stdout.join('')).toBe('');

    const help = createIO();
    expect(await runComponentCli(['--help'], help.io)).toBe(0);
    expect(help.stdout.join('')).toContain('Usage:');
    expect(help.stderr.join('')).toBe('');
  });

  it('reports malformed JSON and usage errors without throwing', async () => {
    const malformed = createIO({}, '{');
    expect(await runComponentCli(['validate'], malformed.io)).toBe(2);
    expect(malformed.stderr.join('')).toContain('Invalid JSON');

    const unknown = createIO();
    expect(await runComponentCli(['unknown'], unknown.io)).toBe(2);
    expect(unknown.stderr.join('')).toContain('Unknown command');
  });

  it('prints help without reading stdin', async () => {
    const state = createIO();
    expect(await runComponentCli(['--help'], state.io)).toBe(0);
    expect(state.stdout.join('')).toContain('buncord-builders validate');
  });

  it('uses the real Bun file, stdin and process I/O boundary', async () => {
    const directory = mkdtempSync(join(import.meta.dir, '.cli-'));
    const input = join(directory, 'Component.json');
    const output = join(directory, 'Generated.ts');
    await Bun.write(input, JSON.stringify({ type: 10, content: 'From file' }));

    const stdout = spyOn(process.stdout, 'write').mockImplementation((() => true) as typeof process.stdout.write);
    const stderr = spyOn(process.stderr, 'write').mockImplementation((() => true) as typeof process.stderr.write);
    const stdin = spyOn(Bun.stdin, 'text').mockResolvedValue(JSON.stringify({ type: 10, content: 'From stdin' }));

    try {
      expect(await runComponentCli(['validate'])).toBe(0);
      expect(await runComponentCli(['generate', input, '--output', output])).toBe(0);
      expect(readFileSync(output, 'utf8')).toContain('new TextDisplayBuilder({');
      expect(await runComponentCli(['validate', join(directory, 'Missing.json')])).toBe(2);
      expect(stdout).toHaveBeenCalled();
      expect(stderr).toHaveBeenCalled();
    } finally {
      stdin.mockRestore();
      stdout.mockRestore();
      stderr.mockRestore();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
