import { describe, expect, it } from 'bun:test';
import {
  BaseComponent, ButtonBuilder, ChannelSelectMenuBuilder, ContainerBuilder,
  LabelBuilder, MentionableSelectMenuBuilder, ModalBuilder, RoleSelectMenuBuilder,
  StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder,
  ButtonStyle, SeparatorBuilder,
  CheckboxGroupBuilder, CheckboxGroupOptionBuilder, RadioGroupBuilder, RadioGroupOptionBuilder,
} from '../src/index.ts';

describe('tree validation boundaries', () => {
  it('checks a root array against the message component budget', () => {
    const components = Array.from({ length: 41 }, () => ({ type: 10, content: 'x' }));
    expect(() => BaseComponent.validateTreeLimits(components)).toThrow('40');
    const issues = BaseComponent.auditTree(components, { structured: true });
    expect(issues.some(issue => issue.code === 'COMPONENT_COUNT_EXCEEDS_LIMIT')).toBe(true);
  });

  it('preserves array paths when reporting duplicate custom ids', () => {
    const issues = BaseComponent.auditTree([
      { type: 2, style: 1, custom_id: 'same', label: 'A' },
      { type: 2, style: 1, custom_id: 'same', label: 'B' },
    ], { structured: true });
    expect(issues.find(issue => issue.code === 'DUPLICATE_CUSTOM_ID')?.path).toBe('[1]');
  });

  it('accepts a modal input with 4000 characters and its label/title', () => {
    const modal = new ModalBuilder({ customId: 'bio', title: 'Form', components: [
      new LabelBuilder({ label: 'Bio', component: new TextInputBuilder({
        customId: 'value', style: TextInputStyle.Paragraph, value: 'x'.repeat(4000),
      }) }),
    ] });
    expect(modal.toJSON().components).toHaveLength(1);
    expect(BaseComponent.auditTree(modal, { structured: true })).toEqual([]);
  });

  it('applies message budgets across separate top-level components', () => {
    expect(() => BaseComponent.validateTreeLimits({ components: [
      { type: 10, content: 'x'.repeat(3000) }, { type: 10, content: 'x'.repeat(1001) },
    ] })).toThrow('4000');
  });

  it('reports missing custom ids on every modal input and select', () => {
    for (const type of [3, 4, 5, 6, 7, 8, 19, 21, 22, 23]) {
      const issues = BaseComponent.auditTree({ type }, { structured: true, context: 'modal' });
      expect(issues.some(issue => issue.code.endsWith('MISSING_CUSTOM_ID'))).toBe(true);
    }
  });

  it('reports malformed string select options without throwing', () => {
    const issues = BaseComponent.auditTree({ type: 3, custom_id: 's', options: [null] }, { structured: true });
    expect(issues.some(issue => issue.severity === 'error')).toBe(true);
  });
});

describe('required fields at serialization', () => {
  for (const [name, create] of [
    ['Button', () => new ButtonBuilder()],
    ['TextInput', () => new TextInputBuilder()],
    ['StringSelect', () => new StringSelectMenuBuilder()],
    ['UserSelect', () => new UserSelectMenuBuilder()],
    ['RoleSelect', () => new RoleSelectMenuBuilder()],
    ['MentionableSelect', () => new MentionableSelectMenuBuilder()],
    ['ChannelSelect', () => new ChannelSelectMenuBuilder()],
  ] as const) {
    it(`refuses an incomplete ${name}`, () => {
      expect(() => create().toJSON()).toThrow();
    });
  }

  it('refuses string select options missing required fields', () => {
    const select = new StringSelectMenuBuilder({ customId: 's' });
    select.data.options = [{ label: 'Missing value' }] as never;
    expect(() => select.toJSON()).toThrow();
  });
});

describe('integer fields', () => {
  for (const value of [NaN, Infinity, -Infinity, 1.5]) {
    it(`rejects ${String(value)} in input constructor and setters`, () => {
      expect(() => new TextInputBuilder({ customId: 'bio', minLength: value })).toThrow();
      expect(() => new TextInputBuilder({ customId: 'bio' }).setMaxLength(value)).toThrow();
      expect(() => new StringSelectMenuBuilder({ customId: 's', required: false, minValues: value as never })).toThrow();
      expect(() => new UserSelectMenuBuilder({ customId: 's' }).setMaxValues(value)).toThrow();
      expect(() => new ContainerBuilder({ accentColor: [value, 0, 0] })).toThrow();
    });
  }

  it('reports invalid integers in raw inputs, selects and uploads', () => {
    for (const payload of [
      { type: 4, custom_id: 'bio', style: 1, min_length: NaN },
      { type: 5, custom_id: 'user', max_values: 1.5 },
      { type: 19, custom_id: 'file', max_values: Infinity },
      { type: 22, custom_id: 'checks', min_values: NaN, options: [{ label: 'A', value: 'a' }] },
    ]) {
      expect(BaseComponent.auditTree(payload, { structured: true }).some(issue => issue.severity === 'error')).toBe(true);
    }
  });

  it('rejects invalid button styles and separator spacing', () => {
    expect(() => new ButtonBuilder({ customId: 'b', style: NaN as ButtonStyle })).toThrow();
    expect(() => new ButtonBuilder({ customId: 'b' }).setStyle(1.5 as ButtonStyle)).toThrow();
    expect(() => new SeparatorBuilder({ spacing: NaN as never })).toThrow();
    expect(() => new SeparatorBuilder().setSpacing(1.5 as never)).toThrow();
  });
});

describe('button field combinations at serialization', () => {
  it('requires the field matching the chosen style', () => {
    expect(() => new ButtonBuilder({ style: ButtonStyle.Link }).toJSON()).toThrow();
    expect(() => new ButtonBuilder({ style: ButtonStyle.Premium }).toJSON()).toThrow();
    const button = new ButtonBuilder({ customId: 'b', label: 'B' }).setURL('https://example.com');
    expect(() => button.toJSON()).toThrow();
  });
});

describe('clone ownership', () => {
  it('isolates nested button emoji objects', () => {
    const original = new ButtonBuilder({ customId: 'b', emoji: { name: 'a' } });
    const copy = original.clone();
    copy.emoji!.name = 'changed';
    expect(original.emoji!.name).toBe('a');
  });

  it('isolates raw select options and their nested emoji', () => {
    const original = new StringSelectMenuBuilder({ customId: 's', options: [
      { label: 'A', value: 'a', emoji: { name: 'a' } },
    ] });
    const copy = original.clone();
    const option = copy.toJSON().options[0]!;
    option.emoji!.name = 'changed';
    expect(original.toJSON().options[0]!.emoji!.name).toBe('a');
  });

  it('isolates a cloned modal child from its original', () => {
    const modal = new ModalBuilder({ customId: 'modal', title: 'Form', components: [
      new LabelBuilder({ label: 'Choice', component: new StringSelectMenuBuilder({
        customId: 's', options: [{ label: 'A', value: 'a', emoji: { name: 'a' } }],
      }) }),
    ] });
    const copy = modal.clone();
    const field = copy.components[0] as LabelBuilder;
    const select = field.component as StringSelectMenuBuilder;
    select.toJSON().options[0]!.emoji!.name = 'changed';
    const original = modal.components[0] as LabelBuilder;
    expect((original.component as StringSelectMenuBuilder).toJSON().options[0]!.emoji!.name).toBe('a');
  });
});

describe('option payload validation', () => {
  it('serializes valid frozen leaf data without writing to it', () => {
    for (const builder of [
      new TextInputBuilder({ customId: 'bio', value: 'Valid' }),
      new RadioGroupOptionBuilder({ label: 'A', value: 'a' }),
      new CheckboxGroupOptionBuilder({ label: 'A', value: 'a' }),
    ]) {
      Object.freeze(builder.data);
      expect(() => builder.toJSON()).not.toThrow();
    }
  });

  it('rejects malformed raw options inserted into public group data', () => {
    for (const builder of [
      new RadioGroupBuilder({ customId: 'r' }), new CheckboxGroupBuilder({ customId: 'c' }),
    ]) {
      builder.data.options = [{ value: 'a' }, { value: 'b', label: 'B' }] as never;
      expect(() => builder.toJSON()).toThrow('label');
    }
  });
});

describe('malformed raw audit data', () => {
  it('reports null default values without throwing', () => {
    expect(() => BaseComponent.auditTree({ type: 5, custom_id: 'user', default_values: [null] })).not.toThrow();
    expect(BaseComponent.auditTree({ type: 5, custom_id: 'user', default_values: [null] }, { structured: true }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ severity: 'error' })]));
  });

  it('rejects null integer fields while allowing a null accent color', () => {
    const issues = BaseComponent.auditTree({ type: 4, custom_id: 'bio', style: null }, { structured: true });
    expect(issues.some(issue => issue.code === 'INVALID_COMPONENT_INTEGER')).toBe(true);
    const valid = BaseComponent.auditTree({ type: 17, accent_color: null, components: [{ type: 10, content: 'Hi' }] }, { structured: true });
    expect(valid.some(issue => issue.code === 'INVALID_COMPONENT_INTEGER')).toBe(false);
  });
});

describe('valid modal round trips', () => {
  it('serializes a one-option checkbox group through its Label and Modal', () => {
    const field = new LabelBuilder({ label: 'Terms', component: new CheckboxGroupBuilder({
      customId: 'terms', required: true, options: [new CheckboxGroupOptionBuilder({ label: 'Accept', value: 'accept' })],
    }) });
    expect(new ModalBuilder({ customId: 'form', title: 'Terms', components: [field] }).toJSON().components).toHaveLength(1);
  });

  it('clones optional selects with minValues zero', () => {
    for (const select of [
      new StringSelectMenuBuilder({ customId: 's', required: false, minValues: 0, options: [{ label: 'A', value: 'a' }] }),
      new UserSelectMenuBuilder({ customId: 'u', required: false, minValues: 0 }),
      new RoleSelectMenuBuilder({ customId: 'r', required: false, minValues: 0 }),
      new MentionableSelectMenuBuilder({ customId: 'm', required: false, minValues: 0 }),
      new ChannelSelectMenuBuilder({ customId: 'c', required: false, minValues: 0 }),
    ]) expect(select.clone().toJSON()).toEqual(select.toJSON());
  });
});

describe('audit traversal guards', () => {
  it('reports cyclic arrays instead of overflowing the call stack', () => {
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(BaseComponent.auditTree(cycle, { structured: true }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CYCLIC_COMPONENT_TREE' })]));
    expect(() => BaseComponent.validateTreeLimits(cycle)).toThrow('cyclic');
  });

  it('reports invalid Symbol integer data without throwing', () => {
    expect(BaseComponent.auditTree({ type: 5, custom_id: 'u', min_values: Symbol('bad') }, { structured: true }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'INVALID_COMPONENT_INTEGER' })]));
  });
});

it('rejects a button whose required style was removed from public data', () => {
  const button = new ButtonBuilder({ customId: 'b', label: 'Button' });
  delete button.data.style;
  expect(() => button.toJSON()).toThrow('style');
});
