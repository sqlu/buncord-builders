import { BaseComponent, type AuditContext, type AuditIssue } from '../builders/base.ts';
import { generateComponentCode } from '../utils/ComponentCodeGenerator.ts';

/** I/O boundary used by the CLI and replaceable by tests or embedders. */
export interface ComponentCliIO {
  readFile(path: string): Promise<string>;
  readStdin(): Promise<string>;
  writeFile(path: string, value: string): Promise<void>;
  stdout(value: string): void;
  stderr(value: string): void;
  /**
   * Whether to emit ANSI colour. Left unset it stays off, so embedded and
   * captured output is plain text.
   */
  color?: boolean;
}

type ComponentCliCommand = 'validate' | 'explain' | 'generate';

interface ComponentCliArguments {
  command: ComponentCliCommand;
  input: string;
  context?: AuditContext;
  json: boolean;
  variableName?: string;
  output?: string;
  /** Set by --color or --no-color, overriding the detected default. */
  color?: boolean;
}

const HELP = `Usage:
  buncord-builders validate [file|-] [--context message|modal] [--json]
  buncord-builders explain  [file|-] [--context message|modal] [--json]
  buncord-builders generate [file|-] [--name identifier] [--output file]

Use - or omit the file to read JSON from stdin.
Colour follows the terminal; force it with --color or turn it off with --no-color.
`;

const DEFAULT_IO: ComponentCliIO = {
  readFile: path => Bun.file(path).text(),
  readStdin: () => Bun.stdin.text(),
  writeFile: async (path, value) => { await Bun.write(path, value); },
  stdout: value => { process.stdout.write(value); },
  stderr: value => { process.stderr.write(value); },
  // Bun resolves this from the terminal, NO_COLOR and FORCE_COLOR.
  color: Bun.enableANSIColors,
};

/** Wraps text in ANSI codes, or leaves it alone when colour is off. */
interface Painter {
  error(value: string): string;
  warning(value: string): string;
  ok(value: string): string;
  dim(value: string): string;
  bold(value: string): string;
}

function createPainter(enabled: boolean): Painter {
  if (!enabled) {
    const plain = (value: string): string => value;
    return { error: plain, warning: plain, ok: plain, dim: plain, bold: plain };
  }
  const wrap = (code: string) => (value: string): string => `\u001B[${code}m${value}\u001B[0m`;
  return { error: wrap('31'), warning: wrap('33'), ok: wrap('32'), dim: wrap('2'), bold: wrap('1') };
}

/** Renders the location suffix, which is empty when the issue is on the root. */
function formatLocation(path: string, paint: Painter): string {
  return path === '' ? '' : paint.dim(` at ${path}`);
}

/** Pads the severity so codes line up whatever the mix of errors and warnings. */
function formatSeverity(issue: AuditIssue, paint: Painter): string {
  const label = issue.severity.toUpperCase().padEnd(7);
  return issue.severity === 'error' ? paint.error(label) : paint.warning(label);
}

function readOptionValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return value;
}

function parseArguments(args: readonly string[]): ComponentCliArguments | 'help' | 'usage' {
  const first = args[0];
  if (first === undefined) return 'usage';
  if (first === '--help' || first === '-h' || first === 'help') return 'help';
  if (first !== 'validate' && first !== 'explain' && first !== 'generate') {
    throw new Error(`Unknown command ${JSON.stringify(first)}`);
  }

  let input = '-';
  let inputWasSet = false;
  let context: AuditContext | undefined;
  let json = false;
  let variableName: string | undefined;
  let output: string | undefined;
  let color: boolean | undefined;

  for (let i = 1; i < args.length; i++) {
    const argument = args[i]!;
    if (argument === '--help' || argument === '-h') return 'help';
    if (argument === '--json') {
      json = true;
      continue;
    }
    if (argument === '--color') {
      color = true;
      continue;
    }
    if (argument === '--no-color') {
      color = false;
      continue;
    }
    if (argument === '--context') {
      const value = readOptionValue(args, i, argument);
      if (value !== 'message' && value !== 'modal') throw new Error('--context must be message or modal');
      context = value;
      i++;
      continue;
    }
    if (argument === '--name') {
      variableName = readOptionValue(args, i, argument);
      i++;
      continue;
    }
    if (argument === '--output' || argument === '-o') {
      output = readOptionValue(args, i, argument);
      i++;
      continue;
    }
    if (argument.startsWith('-') && argument !== '-') throw new Error(`Unknown option ${argument}`);
    if (inputWasSet) throw new Error('Only one input file can be provided');
    input = argument;
    inputWasSet = true;
  }

  if (first !== 'generate' && (variableName !== undefined || output !== undefined)) {
    throw new Error('--name and --output are only available with generate');
  }
  if (first === 'generate' && json) throw new Error('--json is only available with validate or explain');

  return {
    command: first,
    input,
    ...(context === undefined ? {} : { context }),
    json,
    ...(variableName === undefined ? {} : { variableName }),
    ...(output === undefined ? {} : { output }),
    ...(color === undefined ? {} : { color }),
  };
}

async function readJson(input: string, io: ComponentCliIO): Promise<unknown> {
  let source: string;
  try {
    source = input === '-' ? await io.readStdin() : await io.readFile(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read ${input}: ${message}`);
  }

  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${input === '-' ? 'stdin' : input}: ${message}`);
  }
}

function countIssues(issues: readonly AuditIssue[]): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    if (issue.severity === 'error') errors++;
    else warnings++;
  }
  return { errors, warnings };
}

function formatCounts(errors: number, warnings: number): string {
  return [
    errors === 0 ? undefined : `${errors} error${errors === 1 ? '' : 's'}`,
    warnings === 0 ? undefined : `${warnings} warning${warnings === 1 ? '' : 's'}`,
  ].filter((value): value is string => value !== undefined).join(', ');
}

function formatSummary(issues: readonly AuditIssue[], paint: Painter): string {
  const { errors, warnings } = countIssues(issues);
  if (errors === 0 && warnings === 0) return `${paint.ok('✓')} Valid Discord component payload.\n`;

  const status = errors === 0 ? `${paint.ok('✓')} Valid` : `${paint.error('✗')} Invalid`;
  const lines = issues.map(issue =>
    `  ${formatSeverity(issue, paint)} ${paint.bold(issue.code)}${formatLocation(issue.path, paint)}`);
  const hint = paint.dim('  Run the same input through "explain" for the message and a suggested fix.');
  return `${status} Discord component payload: ${formatCounts(errors, warnings)}.\n${lines.join('\n')}\n${hint}\n`;
}

function formatExplanation(issues: readonly AuditIssue[], paint: Painter): string {
  if (issues.length === 0) return `${paint.ok('✓')} Valid Discord component payload.\n`;

  const { errors, warnings } = countIssues(issues);
  const blocks = issues.map(issue => [
    `${formatSeverity(issue, paint)} ${paint.bold(issue.code)}${formatLocation(issue.path, paint)}`,
    `  ${issue.message}`,
    `  ${paint.dim('Fix:')} ${issue.fix}`,
  ].join('\n')).join('\n\n');
  const marker = errors === 0 ? paint.warning('!') : paint.error('✗');
  return `${blocks}\n\n${marker} ${formatCounts(errors, warnings)}.\n`;
}

function formatJson(issues: readonly AuditIssue[]): string {
  const { errors, warnings } = countIssues(issues);
  return `${JSON.stringify({ valid: errors === 0, errors, warnings, issues }, null, 2)}\n`;
}

/** Runs the component CLI and returns a process-compatible exit code. */
export async function runComponentCli(args: readonly string[], io: ComponentCliIO = DEFAULT_IO): Promise<number> {
  // Flags win over detection, but parsing can fail before they are known.
  const detected = createPainter(io.color === true);

  let parsed: ComponentCliArguments | 'help' | 'usage';
  try {
    parsed = parseArguments(args);
  } catch (error) {
    io.stderr(`${detected.error(error instanceof Error ? error.message : String(error))}\n\n${HELP}`);
    return 2;
  }

  if (parsed === 'help') {
    io.stdout(HELP);
    return 0;
  }

  // An invocation with no command is a mistake, not a request for help.
  if (parsed === 'usage') {
    io.stderr(`${detected.error('No command given.')}\n\n${HELP}`);
    return 2;
  }

  const paint = parsed.color === undefined ? detected : createPainter(parsed.color);

  let payload: unknown;
  try {
    payload = await readJson(parsed.input, io);
  } catch (error) {
    io.stderr(`${paint.error(error instanceof Error ? error.message : String(error))}\n`);
    return 2;
  }

  const issues = BaseComponent.auditTree(payload, {
    structured: true,
    ...(parsed.context === undefined ? {} : { context: parsed.context }),
  });
  const { errors } = countIssues(issues);

  if (parsed.command === 'validate' || parsed.command === 'explain') {
    const output = parsed.json
      ? formatJson(issues)
      : parsed.command === 'explain' ? formatExplanation(issues, paint) : formatSummary(issues, paint);
    io.stdout(output);
    return errors === 0 ? 0 : 1;
  }

  if (errors > 0) {
    io.stderr(formatExplanation(issues, paint));
    return 1;
  }

  let code: string;
  try {
    code = generateComponentCode(payload, {
      ...(parsed.variableName === undefined ? {} : { variableName: parsed.variableName }),
    });
  } catch (error) {
    io.stderr(`${paint.error(error instanceof Error ? error.message : String(error))}\n`);
    return 2;
  }

  if (parsed.output !== undefined) {
    try {
      await io.writeFile(parsed.output, code);
    } catch (error) {
      io.stderr(paint.error(`Cannot write ${parsed.output}: ${error instanceof Error ? error.message : String(error)}\n`));
      return 2;
    }
    io.stdout(`${paint.ok('✓')} Generated ${parsed.output}\n`);
  } else {
    io.stdout(code);
  }
  return 0;
}
