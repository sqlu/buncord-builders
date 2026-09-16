import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BaseComponent,
  ButtonBuilder,
  ButtonStyle,
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  ComponentType,
  ContainerBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  UserSelectMenuBuilder,
  componentError,
  isComponentError,
  type AuditIssue,
  type ComponentErrorCode,
} from '../src/index.ts';

/** Runs `fn`, asserts it threw, and hands the error back narrowed. */
function captured(fn: () => unknown): { code: ComponentErrorCode; message: string; fix?: string } {
  try {
    fn();
  } catch (err) {
    if (!isComponentError(err)) throw new Error(`expected a component error, got ${String(err)}`);
    return { code: err.code, message: err.message, ...(err.fix === undefined ? {} : { fix: err.fix }) };
  }
  throw new Error('expected the call to throw');
}

describe('structured errors', () => {
  it('uses structured errors for every builder and component-tree validation throw', () => {
    const root = join(import.meta.dir, '..');
    const files = [
      ...new Bun.Glob('src/builders/*.ts').scanSync({ cwd: root, absolute: true }),
      join(root, 'src/utils/ComponentTree.ts'),
      join(root, 'src/utils/OptionValidation.ts'),
    ];
    const plainThrows = files.flatMap(file => readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) => line.includes('throw new Error')
        ? [`${file.slice(root.length + 1)}:${index + 1}`]
        : []));

    expect(plainThrows).toEqual([]);
  });

  // The common Error surfaces remain stable for existing loggers and snapshots.
  it('preserves the common plain Error behavior', () => {
    const error = componentError('boom', { code: 'STRING_TOO_LONG', path: 'label', fix: 'shorten it' });

    expect(error).toBeInstanceOf(Error);
    expect(error.constructor).toBe(Error);
    expect(error.message).toBe('boom');
    expect(Object.keys(error)).toEqual([]);
    expect(JSON.stringify(error)).toBe('{}');

    expect(error.code).toBe('STRING_TOO_LONG');
    expect(error.path).toBe('label');
    expect(error.fix).toBe('shorten it');
  });

  it('omits context that was never provided', () => {
    const error = componentError('boom', { code: 'CLONE_UNSUPPORTED' });
    expect(error.path).toBeUndefined();
    expect(error.fix).toBeUndefined();
    expect('path' in error).toBe(false);
  });

  it('narrows unknown caught values', () => {
    expect(isComponentError(componentError('x', { code: 'STRING_TOO_LONG' }))).toBe(true);
    expect(isComponentError(new Error('plain'))).toBe(false);
    expect(isComponentError(Object.assign(new Error('filesystem'), { code: 'ENOENT' }))).toBe(false);
    expect(isComponentError('not an error')).toBe(false);
    expect(isComponentError(null)).toBe(false);
  });

  describe('the shared validation helpers carry a code', () => {
    it('reports string bounds', () => {
      expect(captured(() => new ButtonBuilder().setLabel('x'.repeat(81))).code).toBe('STRING_TOO_LONG');
      expect(captured(() => new ButtonBuilder({ style: ButtonStyle.Premium }).setSKUId('')).code)
        .toBe('STRING_TOO_SHORT');
    });

    it('reports numeric and array bounds', () => {
      expect(captured(() => new UserSelectMenuBuilder({ customId: 'u' }).setMaxValues(99)).code)
        .toBe('VALUE_OUT_OF_RANGE');
      expect(captured(() => new SectionBuilder().spliceTextDisplayComponents(0, 0)).code)
        .toBe('ARRAY_LENGTH_INVALID');
    });

    it('reports url schemes and custom id bounds', () => {
      expect(captured(() => new ButtonBuilder().setURL('ftp://example.com' as never)).code)
        .toBe('INVALID_URL_SCHEME');
      expect(captured(() => new ButtonBuilder().setCustomId('')).code).toBe('CUSTOM_ID_LENGTH_INVALID');
      expect(captured(() => new ButtonBuilder().setCustomId('x'.repeat(101))).code)
        .toBe('CUSTOM_ID_LENGTH_INVALID');
    });

    it('reports invalid component ids', () => {
      expect(captured(() => new TextDisplayBuilder({ content: 'x' }).setId(-1)).code)
        .toBe('INVALID_COMPONENT_ID');
    });

    it('reports an unclonable component', () => {
      class Orphan extends BaseComponent {
        public override readonly type = ComponentType.Button;
        override toJSON(): unknown { return {}; }
      }
      expect(captured(() => new Orphan().clone()).code).toBe('CLONE_UNSUPPORTED');
    });
  });

  describe('layout rules share their vocabulary with the auditor', () => {
    it('uses the same code whether a section accessory is missing or wrong', () => {
      const missing = captured(() => new SectionBuilder({
        components: [new TextDisplayBuilder({ content: 'Alone' })],
      }).toJSON());
      expect(missing.code).toBe('SECTION_MISSING_ACCESSORY');

      const audited = BaseComponent.auditTree({
        type: ComponentType.Section,
        components: [{ type: ComponentType.TextDisplay, content: 'Alone' }],
      }, { structured: true }) as AuditIssue[];
      expect(audited.map((issue) => issue.code)).toContain(missing.code);
    });

    it('names illegal container and section children', () => {
      expect(captured(() => new ContainerBuilder()
        .addComponents(new ThumbnailBuilder({ url: 'https://e.dev/a.png' }) as never)).code)
        .toBe('CONTAINER_CHILD_INVALID_TYPE');

      expect(captured(() => new SectionBuilder()
        .addTextDisplayComponents(new SeparatorBuilder() as never)).code)
        .toBe('SECTION_INVALID_CHILD_TYPE');
    });

    it('names missing label and modal fields', () => {
      expect(captured(() => new LabelBuilder({ component: new CheckboxBuilder({ customId: 'c' }) }).toJSON()).code)
        .toBe('LABEL_LABEL_REQUIRED');
      expect(captured(() => new LabelBuilder({ label: 'Terms' }).toJSON()).code)
        .toBe('LABEL_COMPONENT_REQUIRED');
      expect(captured(() => new LabelBuilder({ label: 'x' }).setComponent(new SeparatorBuilder() as never)).code)
        .toBe('LABEL_INVALID_CHILD_TYPE');

      const withoutTitle = new ModalBuilder({ customId: 'form' })
        .addComponents(new TextDisplayBuilder({ content: 'Hello' }));
      expect(captured(() => withoutTitle.toJSON()).code).toBe('MODAL_TITLE_LENGTH_INVALID');

      const withoutId = new ModalBuilder({ title: 'Form' })
        .addComponents(new TextDisplayBuilder({ content: 'Hello' }));
      expect(captured(() => withoutId.toJSON()).code).toBe('MODAL_CUSTOM_ID_REQUIRED');

      expect(captured(() => new ModalBuilder({ title: 'T', customId: 'c' }).toJSON()).code)
        .toBe('MODAL_COMPONENTS_LIMIT');
    });

    it('names select menu bound conflicts', () => {
      // @ts-expect-error - the same rule is enforced at compile time
      expect(captured(() => new UserSelectMenuBuilder({ customId: 'u', minValues: 0 })).code)
        .toBe('SELECT_MENU_MIN_ZERO_REQUIRES_OPTIONAL');
      // @ts-expect-error - the same rule is enforced at compile time
      expect(captured(() => new UserSelectMenuBuilder({ customId: 'u', minValues: 3, maxValues: 2 })).code)
        .toBe('SELECT_MENU_MIN_EXCEEDS_MAX');
      expect(captured(() => new UserSelectMenuBuilder({ customId: 'u' })
        .setDefaultUsers([{ id: '1', type: 'role' }])).code)
        .toBe('SELECT_DEFAULT_VALUE_TYPE_INVALID');
    });

    it('names checkbox group and file upload bound conflicts', () => {
      const option = new CheckboxGroupOptionBuilder({ value: 'one', label: 'One' });

      // @ts-expect-error - the same rule is enforced at compile time
      expect(captured(() => new CheckboxGroupBuilder({ customId: 'choices', options: [option], minValues: 0 })).code)
        .toBe('CHECKBOX_GROUP_MIN_ZERO_REQUIRES_OPTIONAL');
      // @ts-expect-error - the same rule is enforced at compile time
      expect(captured(() => new CheckboxGroupBuilder({ customId: 'choices', options: [option], minValues: 2, maxValues: 1 })).code)
        .toBe('CHECKBOX_GROUP_MIN_EXCEEDS_MAX');
      // @ts-expect-error - the same rule is enforced at compile time
      expect(captured(() => new FileUploadBuilder({ customId: 'files', minValues: 2, maxValues: 1 })).code)
        .toBe('FILE_UPLOAD_MIN_EXCEEDS_MAX');
    });
  });

  // Messages are part of the public surface too: tests and logs downstream match
  // on them, so adding codes must not have reworded anything.
  it('keeps the existing messages untouched', () => {
    expect(captured(() => new ButtonBuilder().setLabel('x'.repeat(81))).message)
      .toBe('label is too long, max is 80 characters but got 81');
    expect(captured(() => new ButtonBuilder().setCustomId('')).message)
      .toBe('customId is too short, need at least 1 character(s) but got 0');
    // @ts-expect-error - the same rule is enforced at compile time
    expect(captured(() => new UserSelectMenuBuilder({ customId: 'u', minValues: 0 })).message)
      .toBe('minValues can only be 0 if required is false');
  });

  it('carries an actionable fix on the rules that have one', () => {
    expect(captured(() => new ButtonBuilder().setLabel('x'.repeat(81))).fix)
      .toBe('Shorten label to 80 characters or fewer');
  });
});
