import { describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateComponentCode } from '../src/index.ts';

describe('generateComponentCode', () => {
  it('turns one component into a builder construction', () => {
    const code = generateComponentCode({
      type: 2,
      style: 1,
      custom_id: 'deploy',
      label: 'Deploy',
    });

    expect(code).toBe(`import {
  ButtonBuilder,
  ButtonStyle,
} from '@buncord/builders';

export const component = new ButtonBuilder({
  style: ButtonStyle.Primary,
  label: "Deploy",
  customId: "deploy",
});
`);
  });

  // The whole point of emitting constructors: the generated code goes through
  // the compile-time guards instead of around them, so it has to use the
  // camelCase constructor options rather than raw wire field names.
  it('uses constructor options, never the raw wire field names', () => {
    const code = generateComponentCode({
      type: 3,
      custom_id: 'pick',
      placeholder: 'Choose',
      min_values: 1,
      max_values: 2,
      options: [{ label: 'A', value: 'a' }],
    });

    expect(code).toContain('new StringSelectMenuBuilder({');
    expect(code).toContain('customId: "pick"');
    expect(code).toContain('minValues: 1');
    expect(code).toContain('maxValues: 2');
    expect(code).not.toContain('custom_id');
    expect(code).not.toContain('min_values');
    expect(code).not.toContain('.from(');
  });

  it('nests child builders instead of inlining raw payloads', () => {
    const code = generateComponentCode({
      type: 17,
      accent_color: 255,
      components: [
        { type: 10, content: 'Hello' },
        { type: 1, components: [{ type: 2, style: 4, custom_id: 'x', label: 'X' }] },
      ],
    });

    expect(code).toContain('new ContainerBuilder({');
    expect(code).toContain('accentColor: 255');
    expect(code).toContain('new TextDisplayBuilder({');
    expect(code).toContain('new ActionRowBuilder({');
    expect(code).toContain('new ButtonBuilder({');
    expect(code).toContain('style: ButtonStyle.Danger');
  });

  it('unwraps unfurled media items down to the url option', () => {
    const thumbnail = generateComponentCode({
      type: 11,
      media: { url: 'https://example.com/a.png' },
      description: 'alt',
    });
    expect(thumbnail).toContain('new ThumbnailBuilder({');
    expect(thumbnail).toContain('url: "https://example.com/a.png"');
    expect(thumbnail).not.toContain('media:');

    const gallery = generateComponentCode({
      type: 12,
      items: [{ media: { url: 'attachment://b.png' }, spoiler: true }],
    });
    expect(gallery).toContain('new MediaGalleryItemBuilder({');
    expect(gallery).toContain('url: "attachment://b.png"');

    const file = generateComponentCode({ type: 13, file: { url: 'attachment://r.zip' } });
    expect(file).toContain('new FileBuilder({');
    expect(file).toContain('url: "attachment://r.zip"');
  });

  it('builds grouped modal options through their option builders', () => {
    const radio = generateComponentCode({
      type: 21,
      custom_id: 'theme',
      options: [{ value: 'dark', label: 'Dark', default: true }],
    });
    expect(radio).toContain('new RadioGroupOptionBuilder({');
    expect(radio).toContain('value: "dark"');

    const checkbox = generateComponentCode({
      type: 22,
      custom_id: 'tags',
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
    });
    expect(checkbox).toContain('new CheckboxGroupOptionBuilder({');
  });

  // `id` and `default_values` are not constructor options, so they have to be
  // applied as chained calls rather than silently dropped.
  it('applies id and default values as chained calls', () => {
    const code = generateComponentCode({
      type: 5,
      custom_id: 'who',
      id: 12,
      default_values: [{ id: '123', type: 'user' }],
    });

    expect(code).toContain('new UserSelectMenuBuilder({');
    expect(code).toContain('.setDefaultUsers([');
    expect(code).toContain('SelectMenuDefaultValueType.User');
    expect(code).toContain('.setId(12)');
  });

  it('generates a message envelope with rebuilt top-level components', () => {
    const code = generateComponentCode({
      flags: 32768,
      components: [{ type: 10, content: 'Hello' }],
    }, { variableName: 'welcome' });

    expect(code).toContain('MessageFlags.IsComponentsV2');
    expect(code).toContain('new TextDisplayBuilder({');
    expect(code).toContain('.toJSON(),');
    expect(code).toContain('export const welcome = {');
  });

  it('generates modal code through the ModalBuilder constructor', () => {
    const code = generateComponentCode({
      title: 'Profile',
      custom_id: 'profile',
      components: [{
        type: 18,
        label: 'Name',
        component: { type: 4, custom_id: 'name', style: 1 },
      }],
    });

    expect(code).toContain('new ModalBuilder({');
    expect(code).toContain('customId: "profile"');
    expect(code).toContain('new LabelBuilder({');
    expect(code).toContain('new TextInputBuilder({');
    expect(code).toContain('style: TextInputStyle.Short');
    expect(code).toContain('export const modal =');
  });

  it('escapes strings and validates the requested identifier', () => {
    expect(generateComponentCode({ type: 10, content: 'a\n"b"' }))
      .toContain('content: "a\\n\\"b\\""');
    expect(() => generateComponentCode({ type: 10, content: 'x' }, { variableName: 'bad-name' }))
      .toThrow('valid TypeScript identifier');
    expect(() => generateComponentCode({ type: 10, content: 'x' }, { variableName: 'class' }))
      .toThrow('valid TypeScript identifier');
  });

  it('renders empty collections and the no-option case', () => {
    expect(generateComponentCode([])).toBe('export const components = [];\n');
    expect(generateComponentCode({ type: 1, components: [] })).toContain('components: []');
    expect(generateComponentCode({ type: 14 })).toContain('new SeparatorBuilder()');
    expect(generateComponentCode({ type: 14, divider: true, spacing: 2 }))
      .toContain('spacing: SeparatorSpacingSize.Large');
    expect(generateComponentCode({ title: 'T', custom_id: 'c', components: [] })).toContain('components: [],');
    expect(generateComponentCode({ components: [] })).toContain('components: [],');
  });

  it('keeps unknown envelope fields and quotes exotic keys', () => {
    const code = generateComponentCode({ 'weird key': 1, components: [{ type: 10, content: 'x' }] });
    expect(code).toContain('"weird key": 1');
  });

  it('rejects payload shapes the builders cannot represent', () => {
    expect(() => generateComponentCode(null)).toThrow('Unsupported payload root');
    expect(() => generateComponentCode([42])).toThrow('Every component must be a JSON object');
    expect(() => generateComponentCode({ type: 10, content: Number.POSITIVE_INFINITY }))
      .toThrow('non-finite number');
    expect(() => generateComponentCode({ type: 10, content: () => 'x' } as never))
      .toThrow('Cannot generate TypeScript for a function value');
    expect(() => generateComponentCode({ type: 11, description: 'no media' }))
      .toThrow('Media component is missing a url');
    expect(() => generateComponentCode({ type: 12, items: [{ description: 'no media' }] }))
      .toThrow('Media gallery item is missing a url');
    expect(() => generateComponentCode({ type: 12, items: [42] }))
      .toThrow('Every media gallery item must be a JSON object');
    expect(() => generateComponentCode({ type: 21, custom_id: 'r', options: [42] }))
      .toThrow('Every option must be a JSON object');
    expect(() => generateComponentCode({ type: 1, components: 'nope' }))
      .toThrow('components must be an array');
    expect(() => generateComponentCode({ type: 3, custom_id: 's', options: 'nope' }))
      .toThrow('options must be an array');
    expect(() => generateComponentCode({ type: 10, content: 'x' }, { moduleName: '' }))
      .toThrow('moduleName cannot be empty');
    expect(() => generateComponentCode({ type: 10, content: 'x', future_field: true }))
      .toThrow('Unsupported field future_field');
  });

  it('round-trips every supported component type through executable generated code', async () => {
    const samples: readonly Record<string, unknown>[] = [
      { type: 1, components: [{ type: 2, style: 1, custom_id: 'b', label: 'B' }], id: 1 },
      { type: 2, style: 1, custom_id: 'b', label: 'B', disabled: true, id: 2 },
      { type: 3, custom_id: 's', options: [{ label: 'A', value: 'a', emoji: { name: '🔥' } }], id: 3 },
      { type: 4, custom_id: 't', style: 2, label: 'L', min_length: 0, max_length: 10, id: 4 },
      { type: 5, custom_id: 'u', default_values: [{ id: '1', type: 'user' }], id: 5 },
      { type: 6, custom_id: 'r', default_values: [{ id: '2', type: 'role' }], id: 6 },
      { type: 7, custom_id: 'm', default_values: [{ id: '1', type: 'user' }, { id: '2', type: 'role' }], max_values: 2, id: 7 },
      { type: 8, custom_id: 'c', channel_types: [0, 2], default_values: [{ id: '3', type: 'channel' }], id: 8 },
      { type: 9, components: [{ type: 10, content: 'S' }], accessory: { type: 11, media: { url: 'https://e.dev/a.png' } }, id: 9 },
      { type: 10, content: 'T', id: 10 },
      { type: 11, media: { url: 'https://e.dev/a.png' }, description: 'A', spoiler: true, id: 11 },
      { type: 12, items: [{ media: { url: 'https://e.dev/a.png' }, spoiler: true }], id: 12 },
      { type: 13, file: { url: 'attachment://a.txt' }, spoiler: true, id: 13 },
      { type: 14, divider: true, spacing: 2, id: 14 },
      { type: 17, accent_color: 255, components: [{ type: 10, content: 'C' }], id: 17 },
      { type: 18, label: 'Agree', component: { type: 23, custom_id: 'yes', default: true }, id: 18 },
      { type: 19, custom_id: 'f', min_values: 0, max_values: 2, required: false, file_types: ['image'], id: 19 },
      { type: 21, custom_id: 'radio', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }], id: 21 },
      { type: 22, custom_id: 'checks', options: [{ label: 'A', value: 'a' }], id: 22 },
      { type: 23, custom_id: 'check', default: true, id: 23 },
    ];
    const directory = mkdtempSync(join(import.meta.dir, '.generated-'));

    try {
      for (let index = 0; index < samples.length; index++) {
        const file = join(directory, `Component${index}.ts`);
        await Bun.write(file, generateComponentCode(samples[index], {
          moduleName: '../../src/index.ts',
          variableName: 'generated',
        }));
        const generated = await import(`${pathToFileURL(file).href}?case=${index}`) as {
          generated: { toJSON(): unknown };
        };
        expect(generated.generated.toJSON()).toEqual(samples[index]);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('preserves constructor type errors in generated source', async () => {
    const directory = mkdtempSync(join(import.meta.dir, '.generated-typecheck-'));
    const file = join(directory, 'InvalidButton.ts');

    try {
      await Bun.write(file, generateComponentCode({
        type: 2,
        style: 5,
        url: 'https://example.com',
        custom_id: 'illegal-on-link-buttons',
        label: 'Open',
      }, {
        moduleName: '../../src/index.ts',
        variableName: 'generated',
      }));

      const result = Bun.spawnSync([
        process.execPath,
        join(import.meta.dir, '../node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--target', 'ESNext',
        '--module', 'ESNext',
        '--moduleResolution', 'bundler',
        '--allowImportingTsExtensions',
        '--skipLibCheck',
        '--types', 'bun-types',
        file,
      ], { cwd: join(import.meta.dir, '..') });
      const diagnostics = `${result.stdout.toString()}${result.stderr.toString()}`;

      expect(result.exitCode).not.toBe(0);
      expect(diagnostics).toContain('Link button must not have a customId or custom_id property');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('escapes the module specifier', () => {
    const code = generateComponentCode({ type: 10, content: 'x' }, { moduleName: "a'b" });
    expect(code).toContain(`from 'a\\'b';`);
  });

  it('rejects unsupported component and root payloads', () => {
    expect(() => generateComponentCode({ type: 16 })).toThrow('Unsupported component type: 16');
    expect(() => generateComponentCode({ content: 'legacy message' })).toThrow('Unsupported payload root');
  });
});
